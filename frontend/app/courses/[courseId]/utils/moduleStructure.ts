import { Module, Material } from '../types/course.types';

export const createModuleStructure = (
  modulesData: any[],
  materials: Material[],
  courseId?: string
): Module[] => {
  const moduleMap = new Map<string, Module>();
  
  // Ensure modulesData is an array
  if (!Array.isArray(modulesData)) {
    console.warn('modulesData is not an array:', modulesData);
    modulesData = [];
  }
  
  // First, create modules from API data
  modulesData.forEach(moduleData => {
    moduleMap.set(moduleData.id, {
      id: moduleData.id,
      title: moduleData.title || moduleData.name || "Untitled Module",
      description: moduleData.description,
      materials: [],
      isExpanded: true // Default to expanded, will be overridden by localStorage
    });
  });
  
  // If no modules exist, create default structure
  if (moduleMap.size === 0) {
    // Create default modules based on common course structure
    const defaultModules = [
      { id: 'student-uploads', title: 'Student Uploads', description: 'Materials uploaded by students' },
      { id: 'week-1', title: 'Week 1', description: 'Introduction and fundamentals' },
      { id: 'week-2', title: 'Week 2', description: 'Core concepts' },
      { id: 'week-3', title: 'Week 3 - Advanced Topics', description: 'Advanced concepts and applications' },
      { id: 'resources', title: 'Course Resources', description: 'Additional materials and references' }
    ];
    
    defaultModules.forEach(module => {
      moduleMap.set(module.id, {
        ...module,
        materials: [],
        isExpanded: true // Default to expanded
      });
    });
  }
  
  // Distribute materials into modules
  materials.forEach(material => {
    if (material.moduleId && moduleMap.has(material.moduleId)) {
      // Material has a valid moduleId and the module exists - use it
      moduleMap.get(material.moduleId)!.materials.push(material);
    } else if (material.moduleId) {
      // Material has moduleId but module doesn't exist in moduleMap
      console.warn(`Material ${material.title} has moduleId ${material.moduleId} but module not found in moduleMap`);
      
      // Create the missing module
      moduleMap.set(material.moduleId, {
        id: material.moduleId,
        title: material.moduleName || `Module ${material.moduleId}`,
        description: '',
        materials: [material],
        isExpanded: true
      });
    } else {
      // Material has no moduleId - only then do smart assignment
      let targetModuleId = 'resources'; // default fallback
      
      // Smart assignment based on file name or type
      const title = material.title.toLowerCase();
      if (title.includes('week 1') || title.includes('intro') || title.includes('introduction')) {
        targetModuleId = 'week-1';
      } else if (title.includes('week 2')) {
        targetModuleId = 'week-2';
      } else if (title.includes('week 3') || title.includes('advanced')) {
        targetModuleId = 'week-3';
      } else if (title.includes('student') || title.includes('upload')) {
        targetModuleId = 'student-uploads';
      }
      
      // Ensure the target module exists
      if (!moduleMap.has(targetModuleId)) {
        moduleMap.set(targetModuleId, {
          id: targetModuleId,
          title: targetModuleId.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          description: '',
          materials: [],
          isExpanded: true
        });
      }
      
      moduleMap.get(targetModuleId)!.materials.push(material);
    }
  });
  
  // Convert to array and sort
  const moduleArray = Array.from(moduleMap.values());
  
  // Sort modules by priority (student uploads first, then weeks, then resources)
  moduleArray.sort((a, b) => {
    const getPriority = (id: string) => {
      if (id === 'student-uploads') return 0;
      if (id.startsWith('week-')) return parseInt(id.split('-')[1]) || 999;
      if (id === 'resources') return 1000;
      return 500;
    };
    
    return getPriority(a.id) - getPriority(b.id);
  });
  
  // Restore accordion state from localStorage if courseId provided
  if (courseId) {
    try {
      const savedState = localStorage.getItem(`course-${courseId}-accordion`);
      if (savedState) {
        const accordionState = JSON.parse(savedState) as Record<string, boolean>;
        moduleArray.forEach(module => {
          if (accordionState.hasOwnProperty(module.id)) {
            module.isExpanded = accordionState[module.id];
          }
        });
      }
    } catch (error) {
      console.warn('Failed to restore accordion state:', error);
    }
  }
  
  return moduleArray;
};

export const filterMaterials = (
  materials: Material[],
  searchQuery: string,
  filters: {
    fileTypes: string[];
    aiProcessed: 'all' | 'processed' | 'unprocessed';
    dateRange: 'all' | 'today' | 'week' | 'month';
  }
): Material[] => {
  return materials.filter(material => {
    // Search query filter
    if (searchQuery && !material.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // File type filter
    if (filters.fileTypes.length > 0 && !filters.fileTypes.includes(material.type)) {
      return false;
    }
    
    // AI processed filter
    if (filters.aiProcessed === 'processed' && !material.processed) {
      return false;
    }
    if (filters.aiProcessed === 'unprocessed' && material.processed) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange !== 'all') {
      const uploadDate = new Date(material.uploadedAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filters.dateRange) {
        case 'today':
          if (diffDays > 0) return false;
          break;
        case 'week':
          if (diffDays > 7) return false;
          break;
        case 'month':
          if (diffDays > 30) return false;
          break;
      }
    }
    
    return true;
  });
};