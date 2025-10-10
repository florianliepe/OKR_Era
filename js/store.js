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
                endDate: null,
                status: "Active"
            }],
            teams: initialData.teams.map(teamName => ({
                id: `team-${teamName.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`,
                name: teamName
            })),
            objectives: [],
            // Future-proofing the data model
            dependencies: []
        };
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
        const newObjective = {
            id: `obj-${Date.now()}`,
            cycleId: this.state.cycles.find(c => c.status === 'Active').id,
            ownerId: data.ownerId,
            title: data.title,
            notes: data.notes,
            progress: 0,
            grade: null,
            keyResults: [],
            // Future-proofing
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
// Expose a limited, safe API to the global window object
window.okrApp = {
    createObjective: (data) => {
        // This function would be called by the chatbot script
        // `data` should be an object like:
        // { ownerId: 'team-id', title: '...', keyResults: [{ title: '...', targetValue: 100 }] }
        console.log("Creating objective via API:", data);
        const store = new Store(); // Re-instantiate to ensure we have the latest state
        const newObjective = store.addObjective({
            ownerId: data.ownerId,
            title: data.title,
            notes: data.notes || ''
        });
        
        if (data.keyResults && Array.isArray(data.keyResults)) {
            data.keyResults.forEach(kr => {
                store.addKeyResult(newObjective.id, {
                    title: kr.title,
                    startValue: kr.startValue || 0,
                    targetValue: kr.targetValue,
                    currentValue: kr.startValue || 0,
                });
            });
        }
        
        // We need a way to tell the main app to re-render.
        // A custom event is a clean way to do this.
        window.dispatchEvent(new CustomEvent('okr-data-changed'));
    }
};
