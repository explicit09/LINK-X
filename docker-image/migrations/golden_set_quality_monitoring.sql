-- Migration: Golden Set Quality Monitoring
-- Provides automated quality measurement and recall tracking

-- Golden set question-answer pairs for quality testing
CREATE TABLE IF NOT EXISTS golden_set_qa_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    expected_chunk_ids UUID[] DEFAULT '{}', -- Array of chunk IDs that should match
    context_metadata JSONB DEFAULT '{}',
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    topic_tags TEXT[] DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Indexes
    INDEX (course_id, is_active),
    INDEX (difficulty_level),
    INDEX USING GIN (topic_tags),
    INDEX USING GIN (expected_chunk_ids)
);

-- Quality test results tracking
CREATE TABLE IF NOT EXISTS quality_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id UUID NOT NULL, -- Groups results from same test run
    qa_pair_id UUID NOT NULL REFERENCES golden_set_qa_pairs(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    
    -- Test execution details
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    test_type TEXT NOT NULL CHECK (test_type IN ('nightly', 'pre_deploy', 'manual', 'ci')),
    
    -- Retrieval results
    retrieved_chunk_ids UUID[] DEFAULT '{}',
    similarity_scores FLOAT[] DEFAULT '{}',
    retrieval_latency_ms INT,
    
    -- Quality metrics
    precision_at_k FLOAT, -- k=5 by default
    recall_at_k FLOAT,
    mrr FLOAT, -- Mean Reciprocal Rank
    ndcg_at_k FLOAT, -- Normalized Discounted Cumulative Gain
    
    -- Answer generation metrics (if using RAG)
    generated_answer TEXT,
    answer_quality_score FLOAT, -- 0-1 similarity to expected answer
    answer_generation_latency_ms INT,
    
    -- Cost tracking
    embedding_cost_cents BIGINT DEFAULT 0,
    generation_cost_cents BIGINT DEFAULT 0,
    
    -- System context
    system_version TEXT,
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    generation_model TEXT,
    
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX (test_run_id),
    INDEX (course_id, executed_at),
    INDEX (test_type, executed_at),
    INDEX (precision_at_k, recall_at_k)
);

-- Quality test baseline tracking
CREATE TABLE IF NOT EXISTS quality_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    baseline_type TEXT NOT NULL CHECK (baseline_type IN ('production', 'staging', 'development')),
    
    -- Aggregate metrics
    avg_precision_at_5 FLOAT,
    avg_recall_at_5 FLOAT,
    avg_mrr FLOAT,
    avg_ndcg_at_5 FLOAT,
    avg_retrieval_latency_ms FLOAT,
    avg_answer_quality_score FLOAT,
    
    -- Test coverage
    total_qa_pairs INT,
    passed_qa_pairs INT,
    failed_qa_pairs INT,
    
    -- Thresholds
    min_precision_threshold FLOAT DEFAULT 0.8,
    min_recall_threshold FLOAT DEFAULT 0.7,
    max_latency_threshold_ms INT DEFAULT 2000,
    
    established_at TIMESTAMPTZ DEFAULT NOW(),
    established_by UUID,
    is_current BOOLEAN DEFAULT true,
    
    -- Only one current baseline per course/type
    UNIQUE (course_id, baseline_type, is_current) WHERE is_current = true,
    
    INDEX (course_id, baseline_type),
    INDEX (established_at)
);

-- Function to execute quality test for a single QA pair
CREATE OR REPLACE FUNCTION execute_quality_test(
    p_qa_pair_id UUID,
    p_test_run_id UUID,
    p_test_type TEXT DEFAULT 'manual',
    p_k INT DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
    v_qa_pair RECORD;
    v_query_embedding vector;
    v_retrieved_chunks RECORD[];
    v_chunk_ids UUID[];
    v_similarities FLOAT[];
    v_precision FLOAT;
    v_recall FLOAT;
    v_mrr FLOAT;
    v_ndcg FLOAT;
    v_latency_start TIMESTAMPTZ;
    v_latency_ms INT;
    v_test_result_id UUID;
BEGIN
    v_latency_start := NOW();
    
    -- Get QA pair details
    SELECT * INTO v_qa_pair
    FROM golden_set_qa_pairs
    WHERE id = p_qa_pair_id AND is_active = true;
    
    IF v_qa_pair IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'QA pair not found or inactive'
        );
    END IF;
    
    -- Generate embedding for the question (mock call - replace with actual embedding service)
    -- In real implementation, this would call OpenAI API
    -- For now, use a placeholder vector
    v_query_embedding := ARRAY[0.1, 0.2, 0.3]::FLOAT[]::vector; -- Replace with actual embedding
    
    -- Perform vector similarity search using audit-compliant function
    SELECT ARRAY_AGG(chunk_id ORDER BY similarity), ARRAY_AGG(similarity ORDER BY similarity)
    INTO v_chunk_ids, v_similarities
    FROM (
        SELECT chunk_id, similarity
        FROM audit_vector_search(
            v_query_embedding,
            v_qa_pair.question,
            v_qa_pair.course_id,
            v_qa_pair.created_by,
            p_k
        )
    ) search_results;
    
    -- Calculate retrieval latency
    v_latency_ms := EXTRACT(EPOCH FROM (NOW() - v_latency_start)) * 1000;
    
    -- Calculate quality metrics
    v_precision := calculate_precision_at_k(v_chunk_ids, v_qa_pair.expected_chunk_ids, p_k);
    v_recall := calculate_recall_at_k(v_chunk_ids, v_qa_pair.expected_chunk_ids, p_k);
    v_mrr := calculate_mrr(v_chunk_ids, v_qa_pair.expected_chunk_ids);
    v_ndcg := calculate_ndcg_at_k(v_chunk_ids, v_qa_pair.expected_chunk_ids, v_similarities, p_k);
    
    -- Store test result
    INSERT INTO quality_test_results (
        test_run_id,
        qa_pair_id,
        course_id,
        test_type,
        retrieved_chunk_ids,
        similarity_scores,
        retrieval_latency_ms,
        precision_at_k,
        recall_at_k,
        mrr,
        ndcg_at_k,
        system_version,
        metadata
    ) VALUES (
        p_test_run_id,
        p_qa_pair_id,
        v_qa_pair.course_id,
        p_test_type,
        v_chunk_ids,
        v_similarities,
        v_latency_ms,
        v_precision,
        v_recall,
        v_mrr,
        v_ndcg,
        current_setting('app.system_version', true),
        jsonb_build_object(
            'k_value', p_k,
            'question_length', LENGTH(v_qa_pair.question),
            'expected_chunks_count', array_length(v_qa_pair.expected_chunk_ids, 1)
        )
    ) RETURNING id INTO v_test_result_id;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'test_result_id', v_test_result_id,
        'metrics', jsonb_build_object(
            'precision_at_k', v_precision,
            'recall_at_k', v_recall,
            'mrr', v_mrr,
            'ndcg_at_k', v_ndcg,
            'latency_ms', v_latency_ms
        ),
        'retrieved_chunks', v_chunk_ids,
        'similarities', v_similarities
    );
END;
$$ LANGUAGE plpgsql;

-- Quality metric calculation functions
CREATE OR REPLACE FUNCTION calculate_precision_at_k(
    retrieved_ids UUID[],
    expected_ids UUID[],
    k INT
) RETURNS FLOAT AS $$
DECLARE
    v_relevant_count INT := 0;
    v_chunk_id UUID;
BEGIN
    -- Count how many retrieved chunks are in expected set
    FOREACH v_chunk_id IN ARRAY retrieved_ids[1:k] LOOP
        IF v_chunk_id = ANY(expected_ids) THEN
            v_relevant_count := v_relevant_count + 1;
        END IF;
    END LOOP;
    
    RETURN CASE WHEN k > 0 THEN v_relevant_count::FLOAT / k ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_recall_at_k(
    retrieved_ids UUID[],
    expected_ids UUID[],
    k INT
) RETURNS FLOAT AS $$
DECLARE
    v_relevant_count INT := 0;
    v_total_relevant INT;
    v_chunk_id UUID;
BEGIN
    v_total_relevant := array_length(expected_ids, 1);
    IF v_total_relevant = 0 THEN
        RETURN 1.0; -- Perfect recall if no relevant documents
    END IF;
    
    -- Count how many expected chunks were retrieved
    FOREACH v_chunk_id IN ARRAY retrieved_ids[1:k] LOOP
        IF v_chunk_id = ANY(expected_ids) THEN
            v_relevant_count := v_relevant_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_relevant_count::FLOAT / v_total_relevant;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_mrr(
    retrieved_ids UUID[],
    expected_ids UUID[]
) RETURNS FLOAT AS $$
DECLARE
    v_rank INT;
    v_chunk_id UUID;
BEGIN
    -- Find rank of first relevant document
    FOR v_rank IN 1..array_length(retrieved_ids, 1) LOOP
        v_chunk_id := retrieved_ids[v_rank];
        IF v_chunk_id = ANY(expected_ids) THEN
            RETURN 1.0 / v_rank;
        END IF;
    END LOOP;
    
    RETURN 0.0; -- No relevant documents found
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_ndcg_at_k(
    retrieved_ids UUID[],
    expected_ids UUID[],
    similarities FLOAT[],
    k INT
) RETURNS FLOAT AS $$
DECLARE
    v_dcg FLOAT := 0;
    v_idcg FLOAT := 0;
    v_i INT;
    v_relevance FLOAT;
    v_ideal_relevance FLOAT;
BEGIN
    -- Calculate DCG
    FOR v_i IN 1..LEAST(k, array_length(retrieved_ids, 1)) LOOP
        v_relevance := CASE WHEN retrieved_ids[v_i] = ANY(expected_ids) THEN 1.0 ELSE 0.0 END;
        IF v_i = 1 THEN
            v_dcg := v_dcg + v_relevance;
        ELSE
            v_dcg := v_dcg + (v_relevance / log(2, v_i + 1));
        END IF;
    END LOOP;
    
    -- Calculate IDCG (assuming perfect ranking)
    FOR v_i IN 1..LEAST(k, array_length(expected_ids, 1)) LOOP
        v_ideal_relevance := 1.0;
        IF v_i = 1 THEN
            v_idcg := v_idcg + v_ideal_relevance;
        ELSE
            v_idcg := v_idcg + (v_ideal_relevance / log(2, v_i + 1));
        END IF;
    END LOOP;
    
    RETURN CASE WHEN v_idcg > 0 THEN v_dcg / v_idcg ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Function to run quality tests for entire course
CREATE OR REPLACE FUNCTION run_course_quality_tests(
    p_course_id UUID,
    p_test_type TEXT DEFAULT 'manual',
    p_k INT DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
    v_test_run_id UUID := gen_random_uuid();
    v_qa_pair RECORD;
    v_results JSONB := '[]'::jsonb;
    v_test_result JSONB;
    v_total_tests INT := 0;
    v_passed_tests INT := 0;
    v_avg_precision FLOAT;
    v_avg_recall FLOAT;
    v_avg_mrr FLOAT;
    v_avg_latency FLOAT;
BEGIN
    -- Execute tests for all active QA pairs in course
    FOR v_qa_pair IN 
        SELECT id 
        FROM golden_set_qa_pairs 
        WHERE course_id = p_course_id AND is_active = true
    LOOP
        v_test_result := execute_quality_test(v_qa_pair.id, v_test_run_id, p_test_type, p_k);
        v_results := v_results || jsonb_build_array(v_test_result);
        v_total_tests := v_total_tests + 1;
        
        -- Count as passed if precision and recall meet minimum thresholds
        IF (v_test_result->'metrics'->>'precision_at_k')::FLOAT >= 0.7 
           AND (v_test_result->'metrics'->>'recall_at_k')::FLOAT >= 0.6 THEN
            v_passed_tests := v_passed_tests + 1;
        END IF;
    END LOOP;
    
    -- Calculate aggregate metrics
    SELECT 
        AVG(precision_at_k),
        AVG(recall_at_k),
        AVG(mrr),
        AVG(retrieval_latency_ms)
    INTO v_avg_precision, v_avg_recall, v_avg_mrr, v_avg_latency
    FROM quality_test_results
    WHERE test_run_id = v_test_run_id;
    
    RETURN jsonb_build_object(
        'test_run_id', v_test_run_id,
        'course_id', p_course_id,
        'test_type', p_test_type,
        'total_tests', v_total_tests,
        'passed_tests', v_passed_tests,
        'pass_rate', CASE WHEN v_total_tests > 0 THEN v_passed_tests::FLOAT / v_total_tests ELSE 0 END,
        'aggregate_metrics', jsonb_build_object(
            'avg_precision_at_k', v_avg_precision,
            'avg_recall_at_k', v_avg_recall,
            'avg_mrr', v_avg_mrr,
            'avg_latency_ms', v_avg_latency
        ),
        'individual_results', v_results,
        'executed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check quality against baseline
CREATE OR REPLACE FUNCTION check_quality_regression(
    p_course_id UUID,
    p_test_run_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_baseline RECORD;
    v_current_metrics RECORD;
    v_regressions JSONB := '[]'::jsonb;
BEGIN
    -- Get current baseline
    SELECT * INTO v_baseline
    FROM quality_baselines
    WHERE course_id = p_course_id 
    AND baseline_type = 'production'
    AND is_current = true;
    
    IF v_baseline IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'no_baseline',
            'message', 'No production baseline found for comparison'
        );
    END IF;
    
    -- Get current test metrics
    SELECT 
        AVG(precision_at_k) as avg_precision,
        AVG(recall_at_k) as avg_recall,
        AVG(mrr) as avg_mrr,
        AVG(retrieval_latency_ms) as avg_latency
    INTO v_current_metrics
    FROM quality_test_results
    WHERE test_run_id = p_test_run_id;
    
    -- Check for regressions
    IF v_current_metrics.avg_precision < v_baseline.min_precision_threshold THEN
        v_regressions := v_regressions || jsonb_build_object(
            'metric', 'precision',
            'current', v_current_metrics.avg_precision,
            'baseline', v_baseline.avg_precision_at_5,
            'threshold', v_baseline.min_precision_threshold,
            'severity', 'CRITICAL'
        );
    END IF;
    
    IF v_current_metrics.avg_recall < v_baseline.min_recall_threshold THEN
        v_regressions := v_regressions || jsonb_build_object(
            'metric', 'recall',
            'current', v_current_metrics.avg_recall,
            'baseline', v_baseline.avg_recall_at_5,
            'threshold', v_baseline.min_recall_threshold,
            'severity', 'CRITICAL'
        );
    END IF;
    
    IF v_current_metrics.avg_latency > v_baseline.max_latency_threshold_ms THEN
        v_regressions := v_regressions || jsonb_build_object(
            'metric', 'latency',
            'current', v_current_metrics.avg_latency,
            'baseline', v_baseline.avg_retrieval_latency_ms,
            'threshold', v_baseline.max_latency_threshold_ms,
            'severity', 'WARNING'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'has_regressions', jsonb_array_length(v_regressions) > 0,
        'regressions', v_regressions,
        'current_metrics', v_current_metrics,
        'baseline_metrics', row_to_json(v_baseline)
    );
END;
$$ LANGUAGE plpgsql;

-- Quality monitoring alerts
CREATE OR REPLACE FUNCTION check_quality_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- Alert on recent quality regressions
    RETURN QUERY
    WITH recent_tests AS (
        SELECT DISTINCT test_run_id, course_id, executed_at
        FROM quality_test_results
        WHERE executed_at > NOW() - INTERVAL '24 hours'
        AND test_type = 'nightly'
    ),
    regression_checks AS (
        SELECT 
            rt.course_id,
            rt.test_run_id,
            rt.executed_at,
            check_quality_regression(rt.course_id, rt.test_run_id) as regression_result
        FROM recent_tests rt
    )
    SELECT 
        'QUALITY_REGRESSION'::TEXT,
        CASE 
            WHEN rc.regression_result->'regressions' @> '[{"severity": "CRITICAL"}]' THEN 'CRITICAL'
            ELSE 'WARNING'
        END::TEXT,
        format('Quality regression detected in course %s', rc.course_id),
        rc.regression_result
    FROM regression_checks rc
    WHERE (rc.regression_result->>'has_regressions')::boolean = true;
    
    -- Alert on missing quality tests
    RETURN QUERY
    SELECT 
        'MISSING_QUALITY_TESTS'::TEXT,
        'WARNING'::TEXT,
        format('No quality tests run for course %s in past 48 hours', c.id),
        jsonb_build_object(
            'course_id', c.id,
            'course_name', c.name,
            'last_test', MAX(qtr.executed_at)
        )
    FROM courses c
    LEFT JOIN quality_test_results qtr ON qtr.course_id = c.id
    WHERE c.created_at < NOW() - INTERVAL '48 hours' -- Don't alert on very new courses
    GROUP BY c.id, c.name
    HAVING MAX(qtr.executed_at) < NOW() - INTERVAL '48 hours' OR MAX(qtr.executed_at) IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Quality dashboard view
CREATE OR REPLACE VIEW quality_dashboard AS
WITH latest_tests AS (
    SELECT DISTINCT ON (course_id)
        course_id,
        test_run_id,
        executed_at,
        test_type
    FROM quality_test_results
    ORDER BY course_id, executed_at DESC
),
course_metrics AS (
    SELECT 
        qtr.course_id,
        lt.executed_at as last_test_time,
        COUNT(*) as total_qa_pairs,
        AVG(qtr.precision_at_k) as avg_precision,
        AVG(qtr.recall_at_k) as avg_recall,
        AVG(qtr.mrr) as avg_mrr,
        AVG(qtr.retrieval_latency_ms) as avg_latency_ms,
        COUNT(*) FILTER (WHERE qtr.precision_at_k >= 0.7 AND qtr.recall_at_k >= 0.6) as passed_tests
    FROM latest_tests lt
    JOIN quality_test_results qtr ON qtr.test_run_id = lt.test_run_id
    GROUP BY qtr.course_id, lt.executed_at
)
SELECT 
    c.id as course_id,
    c.name as course_name,
    c.instructor_id,
    cm.last_test_time,
    cm.total_qa_pairs,
    cm.avg_precision,
    cm.avg_recall,
    cm.avg_mrr,
    cm.avg_latency_ms,
    cm.passed_tests,
    ROUND((cm.passed_tests::FLOAT / cm.total_qa_pairs * 100), 1) as pass_rate_percent,
    CASE 
        WHEN cm.last_test_time IS NULL THEN 'NO_TESTS'
        WHEN cm.last_test_time < NOW() - INTERVAL '48 hours' THEN 'STALE'
        WHEN cm.avg_precision < 0.7 OR cm.avg_recall < 0.6 THEN 'FAILING'
        WHEN cm.pass_rate_percent < 80 THEN 'WARNING'
        ELSE 'HEALTHY'
    END as status
FROM courses c
LEFT JOIN course_metrics cm ON cm.course_id = c.id
ORDER BY cm.last_test_time DESC NULLS LAST;

-- Comments
COMMENT ON TABLE golden_set_qa_pairs IS 'Curated question-answer pairs for quality testing and recall measurement';
COMMENT ON TABLE quality_test_results IS 'Results of quality tests including precision, recall, and latency metrics';
COMMENT ON FUNCTION execute_quality_test IS 'Executes a single quality test and calculates retrieval metrics';
COMMENT ON FUNCTION run_course_quality_tests IS 'Runs all quality tests for a course and returns aggregate results';
COMMENT ON VIEW quality_dashboard IS 'Dashboard view showing quality metrics and status for all courses';