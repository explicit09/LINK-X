"""
Circuit Breaker Monitoring API
"""
from flask import Blueprint, jsonify
from core.circuit_breaker import circuit_breaker_status, get_all_circuit_breakers

bp = Blueprint('circuit_breaker', __name__)


@bp.route('/status', methods=['GET'])
def get_circuit_breaker_status():
    """Get status of all circuit breakers"""
    try:
        status = circuit_breaker_status()
        
        # Add health indicator
        all_healthy = all(
            cb['state'] == 'closed' 
            for cb in status.values()
        )
        
        return jsonify({
            'healthy': all_healthy,
            'circuit_breakers': status,
            'total': len(status)
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to get circuit breaker status',
            'message': str(e)
        }), 500


@bp.route('/reset/<name>', methods=['POST'])
def reset_circuit_breaker(name: str):
    """Manually reset a circuit breaker"""
    try:
        breakers = get_all_circuit_breakers()
        
        if name not in breakers:
            return jsonify({
                'error': 'Circuit breaker not found',
                'name': name
            }), 404
            
        breakers[name].reset()
        
        return jsonify({
            'message': f'Circuit breaker {name} reset successfully',
            'state': breakers[name].state.value
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to reset circuit breaker',
            'message': str(e)
        }), 500