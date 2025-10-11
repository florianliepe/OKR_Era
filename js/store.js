class Store {
    constructor() {
        this.STORAGE_KEY = 'okrAppData';
        this.state = this.loadState();
    }

    loadState() {
        const savedState = localStorage.getItem(this.STORAGE_KEY);
        if (savedState) {
            return JSON.parse(savedState);
        }
        return null; // Return null if no state, indicating first-time setup
    }

    saveState() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    }
    
    // Used for Excel import, a destructive action
    replaceState(newState) {
        this.state = newState;
        this.saveState();
    }

    getState() {
        return this.state;
    }

    // --- Setup ---
    initializeAppState(initialData) {
        this.state = {
            version: "1.0",
            companyName: initialData.companyName,
            foundation: {
                mission: initialData.mission,
                vision: initialData.vision,
            },
            cycles: [{
                id: `cycle-${Date.now()}`,
                name: "Initial Cycle",
                startDate: new Date().toISOString().split('T')[0],
                endDate: "",
                status: "Active"
            }],
            teams: initialData.teams.map(teamName => ({
                id: `team-${teamName.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`,
                name: teamName
            })),
            objectives: [],
            dependencies: []
        };
        this.saveState();
    }
    
    // --- Cycle Management ---
    addCycle(data) {
        const newCycle = {
            id: `cycle-${Date.now()}`,
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate,
            status: "Archived" // New cycles are not active by default
        };
        this.state.cycles.push(newCycle);
        this.saveState();
    }

    updateCycle(id, data) {
        const cycle = this.state.cycles.find(c => c.id === id);
        if(cycle) {
            cycle.name = data.name;
            cycle.startDate = data.startDate;
            cycle.endDate = data.endDate;
            this.saveState();
        }
    }

    deleteCycle(id) {
        // Prevent deleting the last or active cycle
        if (this.state.cycles.length <= 1) return alert('Cannot delete the last cycle.');
        const cycle = this.state.cycles.find(c => c.id === id);
        if(cycle.status === 'Active') return alert('Cannot delete the active cycle.');

        this.state.cycles = this.state.cycles.filter(c => c.id !== id);
        // Also remove objectives associated with this cycle
        this.state.objectives = this.state.objectives.filter(o => o.cycleId !== id);
        this.saveState();
    }

    setActiveCycle(id) {
        this.state.cycles.forEach(cycle => {
            cycle.status = (cycle.id === id) ? 'Active' : 'Archived';
        });
        this.saveState();
    }

    // --- Helpers ---
    getOwnerName(ownerId) {
        if (ownerId === 'company') return this.state.companyName;
        const team = this.state.teams.find(t => t.id === ownerId);
        return team ? team.name : 'Unknown';
    }

    calculateProgress(objective) {
        if (!objective.keyResults || objective.keyResults.length === 0) {
            return 0;
        }
        const totalProgress = objective.keyResults.reduce((sum, kr) => {
            const start = kr.startValue;
            const target = kr.targetValue;
            const current = kr.currentValue;
            if (target === start) return sum + 100;
            const progress = Math.max(0, Math.min(100, ((current - start) / (target - start)) * 100));
            kr.progress = Math.round(progress);
            return sum + progress;
        }, 0);
        return Math.round(totalProgress / objective.keyResults.length);
    }
    
    // --- CRUD Operations ---
    addObjective(data) {
        const activeCycle = this.state.cycles.find(c => c.status === 'Active');
        if (!activeCycle) {
            alert('No active cycle. Please set an active cycle in Settings.');
            return null;
        }
        const newObjective = {
            id: `obj-${Date.now()}`,
            cycleId: activeCycle.id,
            ownerId: data.ownerId,
            title: data.title,
            notes: data.notes,
            progress: 0,
            grade: null,
            keyResults: [],
            progressHistory: [{ date: new Date().toISOString(), progress: 0 }]
        };
        this.state.objectives.push(newObjective);
        this.saveState();
        return newObjective;
    }

    updateObjective(id, data) {
        const objective = this.state.objectives.find(o => o.id === id);
        if (objective) {
            objective.title = data.title;
            objective.ownerId = data.ownerId;
            objective.notes = data.notes;
            this.saveState();
        }
    }

    deleteObjective(id) {
        this.state.objectives = this.state.objectives.filter(o => o.id !== id);
        this.saveState();
    }

    addKeyResult(objectiveId, data) {
        const objective = this.state.objectives.find(o => o.id === objectiveId);
        if (objective) {
            const newKr = {
                id: `kr-${Date.now()}`,
                title: data.title,
                startValue: Number(data.startValue),
                targetValue: Number(data.targetValue),
                currentValue: Number(data.currentValue),
                progress: 0
            };
            objective.keyResults.push(newKr);
            objective.progress = this.calculateProgress(objective);
            this.saveState();
        }
    }

    updateKeyResult(objectiveId, krId, data) {
        const objective = this.state.objectives.find(o => o.id === objectiveId);
        if (objective) {
            const kr = objective.keyResults.find(k => k.id === krId);
            if (kr) {
                kr.title = data.title;
                kr.startValue = Number(data.startValue);
                kr.targetValue = Number(data.targetValue);
                kr.currentValue = Number(data.currentValue);
                objective.progress = this.calculateProgress(objective);
                this.saveState();
            }
        }
    }

    deleteKeyResult(objectiveId, krId) {
        const objective = this.state.objectives.find(o => o.id === objectiveId);
        if (objective) {
            objective.keyResults = objective.keyResults.filter(k => k.id !== krId);
            objective.progress = this.calculateProgress(objective);
            this.saveState();
        }
    }
}

// --- Chatbot API ---
window.okrApp = {
    createObjective: (data) => {
        console.log("Creating objective via API:", data);
        const store = new Store();
        const newObjective = store.addObjective({
            ownerId: data.ownerId,
            title: data.title,
            notes: data.notes || ''
        });
        
        if (newObjective && data.keyResults && Array.isArray(data.keyResults)) {
            data.keyResults.forEach(kr => {
                store.addKeyResult(newObjective.id, {
                    title: kr.title,
                    startValue: kr.startValue || 0,
                    targetValue: kr.targetValue,
                    currentValue: kr.startValue || 0,
                });
            });
        }
        
        window.dispatchEvent(new CustomEvent('okr-data-changed'));
    }
};
