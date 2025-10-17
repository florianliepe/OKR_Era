class Store {
    constructor() {
        this.STORAGE_KEY = 'okrAppMultiProject';
        this.appData = this.loadAppData();
        this.migrateLegacyData();
    }

    loadAppData() {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (savedData) {
            return JSON.parse(savedData);
        }
        // First time ever, initialize the structure
        return {
            currentProjectId: null,
            projects: []
        };
    }

    saveAppData() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.appData));
    }
    
    migrateLegacyData() {
        const legacyData = localStorage.getItem('okrAppData');
        if (legacyData) {
            console.log('Legacy data found. Migrating...');
            const project = JSON.parse(legacyData);
            const newProject = {
                id: `proj-${Date.now()}`,
                name: project.companyName || 'Migrated Project',
                ...project
            };
            this.appData.projects.push(newProject);
            this.appData.currentProjectId = newProject.id;
            this.saveAppData();
            localStorage.removeItem('okrAppData'); // Clean up old data
            console.log('Migration complete.');
        }
    }

    // --- Project Level ---
    getProjects() {
        return this.appData.projects;
    }
    
    setCurrentProjectId(projectId) {
        this.appData.currentProjectId = projectId;
        this.saveAppData();
    }

    getCurrentProject() {
        if (!this.appData.currentProjectId) return null;
        return this.appData.projects.find(p => p.id === this.appData.currentProjectId);
    }
    
    createNewProject(initialData) {
        const newProject = {
            id: `proj-${Date.now()}`,
            name: initialData.projectName,
            companyName: initialData.projectName, // Use project name as company name
            foundation: {
                mission: initialData.mission,
                vision: initialData.vision,
            },
            cycles: [{
                id: `cycle-${Date.now()}`, name: "Initial Cycle",
                startDate: new Date().toISOString().split('T')[0], endDate: "", status: "Active"
            }],
            teams: initialData.teams.map((teamName, index) => ({
                id: `team-${Date.now() + index}`, name: teamName
            })),
            objectives: [],
            dependencies: []
        };
        this.appData.projects.push(newProject);
        this.saveAppData();
        return newProject;
    }

    deleteProject(projectId) {
        this.appData.projects = this.appData.projects.filter(p => p.id !== projectId);
        if (this.appData.currentProjectId === projectId) {
            this.appData.currentProjectId = null;
        }
        this.saveAppData();
    }

    // --- Methods operating on the CURRENT project ---
    // Note: All old methods are now wrapped to get the current project first
    _updateCurrentProject(updateFn) {
        const project = this.getCurrentProject();
        if (project) {
            updateFn(project);
            this.saveAppData();
        }
    }
    
    addCycle(data) { this._updateCurrentProject(p => p.cycles.push({ id: `cycle-${Date.now()}`, ...data, status: "Archived" })); }
    setActiveCycle(id) { this._updateCurrentProject(p => p.cycles.forEach(c => c.status = (c.id === id) ? 'Active' : 'Archived')); }
    deleteCycle(id) { this._updateCurrentProject(p => { /* ... delete logic ... */ }); }
    updateFoundation(data) { this._updateCurrentProject(p => p.foundation = data); }
    addObjective(data) { this._updateCurrentProject(p => { /* ... add logic ... */ }); }
    // ... and so on for all other CRUD methods (updateObjective, deleteObjective, addKeyResult, etc.)
}
