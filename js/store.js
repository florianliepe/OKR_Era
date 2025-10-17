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
        return { currentProjectId: null, projects: [] };
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
            this.appData.currentProjectId = this.appData.projects[0].id;
            this.saveAppData();
            localStorage.removeItem('okrAppData');
            console.log('Migration complete.');
        }
    }

    getProjects() { return this.appData.projects; }
    setCurrentProjectId(projectId) { this.appData.currentProjectId = projectId; this.saveAppData(); }
    getCurrentProject() {
        if (!this.appData.currentProjectId) return null;
        return this.appData.projects.find(p => p.id === this.appData.currentProjectId);
    }
    
    createNewProject(initialData) {
        const newProject = {
            id: `proj-${Date.now()}`,
            name: initialData.projectName,
            companyName: initialData.projectName,
            foundation: { mission: initialData.mission, vision: initialData.vision },
            cycles: [{ id: `cycle-${Date.now()}`, name: "Initial Cycle", startDate: new Date().toISOString().split('T')[0], endDate: "", status: "Active" }],
            teams: initialData.teams.map((teamName, index) => ({ id: `team-${Date.now() + index}`, name: teamName })),
            objectives: [], dependencies: []
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

    _updateCurrentProject(updateFn) {
        const project = this.getCurrentProject();
        if (project) {
            updateFn(project);
            this.saveAppData();
        }
    }
    
    // --- Methods operating on the CURRENT project ---
    addCycle(data) { this._updateCurrentProject(p => p.cycles.push({ id: `cycle-${Date.now()}`, ...data, status: "Archived" })); }
    setActiveCycle(id) { this._updateCurrentProject(p => p.cycles.forEach(c => c.status = (c.id === id) ? 'Active' : 'Archived')); }
    deleteCycle(id) { this._updateCurrentProject(p => { 
        if (p.cycles.length <= 1 || p.cycles.find(c => c.id === id)?.status === 'Active') return;
        p.cycles = p.cycles.filter(c => c.id !== id);
        p.objectives = p.objectives.filter(o => o.cycleId !== id);
    }); }
    updateFoundation(data) { this._updateCurrentProject(p => p.foundation = data); }
    addObjective(data) { this._updateCurrentProject(p => {
        const activeCycle = p.cycles.find(c => c.status === 'Active');
        if (!activeCycle) return;
        p.objectives.push({ id: `obj-${Date.now()}`, cycleId: activeCycle.id, ...data, progress: 0, keyResults: [] });
    }); }
    updateObjective(id, data) { this._updateCurrentProject(p => {
        const obj = p.objectives.find(o => o.id === id);
        if (obj) Object.assign(obj, data);
    });}
    deleteObjective(id) { this._updateCurrentProject(p => p.objectives = p.objectives.filter(o => o.id !== id));}
    addKeyResult(objId, data) { this._updateCurrentProject(p => {
        const obj = p.objectives.find(o => o.id === objId);
        if (obj) {
            obj.keyResults.push({id: `kr-${Date.now()}`, ...data});
            obj.progress = this.calculateProgress(obj);
        }
    });}
    updateKeyResult(objId, krId, data) { this._updateCurrentProject(p => {
        const obj = p.objectives.find(o => o.id === objId);
        if (obj) {
            const kr = obj.keyResults.find(k => k.id === krId);
            if(kr) Object.assign(kr, data);
            obj.progress = this.calculateProgress(obj);
        }
    });}
    deleteKeyResult(objId, krId) { this._updateCurrentProject(p => {
        const obj = p.objectives.find(o => o.id === objId);
        if (obj) {
            obj.keyResults = obj.keyResults.filter(k => k.id !== krId);
            obj.progress = this.calculateProgress(obj);
        }
    });}
    getOwnerName(ownerId) { const p = this.getCurrentProject(); if (!p) return ''; if(ownerId === 'company') return p.companyName; const team = p.teams.find(t => t.id === ownerId); return team ? team.name : 'Unknown'; }
    calculateProgress(objective) {
        if (!objective.keyResults || objective.keyResults.length === 0) return 0;
        const total = objective.keyResults.reduce((sum, kr) => {
            const start = Number(kr.startValue), target = Number(kr.targetValue), current = Number(kr.currentValue);
            if (target === start) return sum + 1;
            kr.progress = Math.max(0, Math.min(100, ((current - start) / (target - start)) * 100));
            return sum + kr.progress;
        }, 0);
        return Math.round(total / objective.keyResults.length);
    }
}
