class UI {
    constructor(store) {
        this.store = store;
        this.appContainer = document.getElementById('app-container');
        this.wizardModal = new bootstrap.Modal(document.getElementById('setupWizardModal'));
        this.objectiveModal = new bootstrap.Modal(document.getElementById('objectiveModal'));
        this.keyResultModal = new bootstrap.Modal(document.getElementById('keyResultModal'));
        this.cycleManagementModal = new bootstrap.Modal(document.getElementById('cycleManagementModal'));
    }

    render(searchTerm = '') {
        const state = this.store.getState();
        if (!state) {
            this.renderSetupWizard(1);
            this.wizardModal.show();
        } else {
            document.getElementById('add-objective-btn').disabled = false;
            document.getElementById('cycle-selector-btn').disabled = false;
            this.renderNavControls(state);
            this.renderOkrExplorer(state, searchTerm.toLowerCase());
        }
    }
    
    renderNavControls(state) {
        const cycleSelectorList = document.getElementById('cycle-selector-list');
        const cycleSelectorBtn = document.getElementById('cycle-selector-btn');
        const activeCycle = state.cycles.find(c => c.status === 'Active') || state.cycles[0];
        
        cycleSelectorBtn.textContent = activeCycle.name;
        cycleSelectorList.innerHTML = state.cycles.map(cycle => `
            <li><a class="dropdown-item ${cycle.id === activeCycle.id ? 'active' : ''}" href="#" data-id="${cycle.id}">${cycle.name}</a></li>
        `).join('');
    }

    renderOkrExplorer(state, searchTerm) {
        const activeCycle = state.cycles.find(c => c.status === 'Active');
        if (!activeCycle) {
            this.appContainer.innerHTML = '<div class="alert alert-warning">No active cycle found. Please set an active cycle in the settings.</div>';
            return;
        }

        let objectives = state.objectives.filter(o => o.cycleId === activeCycle.id);

        if (searchTerm) {
            objectives = objectives.filter(o => 
                o.title.toLowerCase().includes(searchTerm) ||
                (o.notes && o.notes.toLowerCase().includes(searchTerm)) ||
                o.keyResults.some(kr => kr.title.toLowerCase().includes(searchTerm))
            );
        }

        const companyObjectives = objectives.filter(o => o.ownerId === 'company');
        let html = this.renderObjectiveGroup(state.companyName, companyObjectives);

        state.teams.forEach(team => {
            const teamObjectives = objectives.filter(o => o.ownerId === team.id);
            if (teamObjectives.length > 0) {
                html += this.renderObjectiveGroup(team.name, teamObjectives, team.id);
            }
        });
        
        if (!html && searchTerm) {
            this.appContainer.innerHTML = `<div class="text-center p-5"><h3>No objectives match your search for "${searchTerm}".</h3></div>`;
        } else if (!html) {
             this.appContainer.innerHTML = '<div class="text-center p-5 bg-body-secondary rounded"><h3>No Objectives Yet for this Cycle</h3><p>Click "Add Objective" to get started.</p></div>';
        } else {
            this.appContainer.innerHTML = html;
        }
    }
    
    renderCycleManager() {
        const state = this.store.getState();
        const cycleList = document.getElementById('cycle-list');
        cycleList.innerHTML = state.cycles.map(cycle => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${cycle.name}</strong> ${cycle.status === 'Active' ? '<span class="badge bg-success">Active</span>' : ''}
                    <br>
                    <small class="text-muted">${cycle.startDate} to ${cycle.endDate || 'Ongoing'}</small>
                </div>
                <div class="btn-group">
                    ${cycle.status !== 'Active' ? `<button class="btn btn-sm btn-outline-success set-active-cycle-btn" data-id="${cycle.id}">Set Active</button>` : ''}
                    <button class="btn btn-sm btn-outline-secondary edit-cycle-btn" data-id="${cycle.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-cycle-btn" data-id="${cycle.id}"><i class="bi bi-trash"></i></button>
                </div>
            </li>
        `).join('');
    }

    // ... (renderObjectiveGroup, renderOkrCard, renderKeyResult, renderSetupWizard remain the same) ...
    renderObjectiveGroup(groupName, objectives, ownerId = 'company') { ... }
    renderOkrCard(objective) { ... }
    renderKeyResult(kr, objectiveId) { ... }
    renderSetupWizard(step) { ... }
}
