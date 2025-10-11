class UI {
    constructor(store) {
        this.store = store;
        this.wizardModal = new bootstrap.Modal(document.getElementById('setupWizardModal'));
        this.objectiveModal = new bootstrap.Modal(document.getElementById('objectiveModal'));
        this.keyResultModal = new bootstrap.Modal(document.getElementById('keyResultModal'));
        
        this.views = {
            'explorer-view': document.getElementById('explorer-view'),
            'cycles-view': document.getElementById('cycles-view'),
            'foundation-view': document.getElementById('foundation-view'),
        };
        this.topBarControls = document.getElementById('nav-controls');
        this.viewTitle = document.getElementById('view-title');
    }

    showView(viewId) {
        Object.values(this.views).forEach(view => view.style.display = 'none');
        if (this.views[viewId]) {
            this.views[viewId].style.display = 'block';
        }
        document.querySelectorAll('#sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewId) link.classList.add('active');
        });
        
        if (viewId === 'explorer-view') {
            this.topBarControls.style.display = 'flex';
            this.viewTitle.textContent = 'OKR Explorer';
        } else {
            this.topBarControls.style.display = 'none';
            if (viewId === 'cycles-view') this.viewTitle.textContent = 'Cycle Management';
            if (viewId === 'foundation-view') this.viewTitle.textContent = 'North Star (Mission & Vision)';
        }
    }
    
    renderInitialState() {
        const state = this.store.getState();
        if (!state) {
            this.renderSetupWizard(1);
            this.wizardModal.show();
        } else {
            this.renderNavControls(state);
        }
    }

    renderExplorerView(searchTerm = '') {
        const state = this.store.getState();
        const activeCycle = state.cycles.find(c => c.status === 'Active');
        if (!activeCycle) {
            this.views['explorer-view'].innerHTML = '<div class="alert alert-warning">No active cycle found. Please set an active cycle in Cycle Management.</div>';
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
            html += this.renderObjectiveGroup(team.name, teamObjectives, team.id);
        });
        
        if (!html && searchTerm) {
            this.views['explorer-view'].innerHTML = `<div class="text-center p-5"><h3>No objectives match your search for "${searchTerm}".</h3></div>`;
        } else if (!html) {
             this.views['explorer-view'].innerHTML = '<div class="text-center p-5 bg-body-secondary rounded"><h3>No Objectives Yet for this Cycle</h3><p>Click "Add Objective" to get started.</p></div>';
        } else {
            this.views['explorer-view'].innerHTML = html;
        }
    }

    renderCyclesView() {
        const state = this.store.getState();
        const html = `
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header"><h6>Existing Cycles</h6></div>
                        <ul class="list-group list-group-flush" id="cycle-list-view">
                            ${state.cycles.map(cycle => this.renderCycleListItem(cycle)).join('')}
                        </ul>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Add New Cycle</h5>
                            <form id="add-cycle-form">
                                <div class="mb-3">
                                    <label for="cycle-name" class="form-label">Cycle Name</label>
                                    <input type="text" id="cycle-name" class="form-control" placeholder="e.g., Q1 2026" required>
                                </div>
                                <div class="mb-3">
                                    <label for="cycle-start-date" class="form-label">Start Date</label>
                                    <input type="date" id="cycle-start-date" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label for="cycle-end-date" class="form-label">End Date</label>
                                    <input type="date" id="cycle-end-date" class="form-control">
                                </div>
                                <button type="submit" class="btn btn-primary">Add Cycle</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;
        this.views['cycles-view'].innerHTML = html;
    }

    renderFoundationView(isEditing = false) {
        const state = this.store.getState();
        const { mission, vision } = state.foundation;
        const html = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5>Guiding Principles</h5>
                    ${isEditing ? `
                        <div>
                            <button class="btn btn-secondary btn-sm" id="cancel-foundation-btn">Cancel</button>
                            <button class="btn btn-success btn-sm" id="save-foundation-btn">Save Changes</button>
                        </div>
                    ` : `
                        <button class="btn btn-outline-secondary btn-sm" id="edit-foundation-btn"><i class="bi bi-pencil"></i> Edit</button>
                    `}
                </div>
                <div class="card-body">
                    <div class="mb-4">
                        <h6>Mission Statement</h6>
                        ${isEditing ? `
                            <textarea id="edit-mission" class="form-control" rows="4">${mission}</textarea>
                        ` : `<p class="lead">${mission.replace(/\n/g, '<br>')}</p>`}
                    </div>
                    <hr>
                    <div>
                        <h6>Vision Statement</h6>
                        ${isEditing ? `
                            <textarea id="edit-vision" class="form-control" rows="4">${vision}</textarea>
                        ` : `<p class="lead">${vision.replace(/\n/g, '<br>')}</p>`}
                    </div>
                </div>
            </div>
        `;
        this.views['foundation-view'].innerHTML = html;
    }

    renderCycleListItem(cycle) {
        return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${cycle.name}</strong> ${cycle.status === 'Active' ? '<span class="badge bg-success">Active</span>' : ''}
                    <br><small class="text-muted">${cycle.startDate} to ${cycle.endDate || 'Ongoing'}</small>
                </div>
                <div class="btn-group">
                    ${cycle.status !== 'Active' ? `<button class="btn btn-sm btn-outline-success set-active-cycle-btn" data-id="${cycle.id}">Set Active</button>` : ''}
                    <button class="btn btn-sm btn-outline-danger delete-cycle-btn" data-id="${cycle.id}"><i class="bi bi-trash"></i></button>
                </div>
            </li>`;
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

    renderObjectiveGroup(groupName, objectives) {
        if (objectives.length === 0) return '';
        return `
            <div class="mb-5">
                <h2 class="team-header">${groupName}</h2>
                <div class="row g-4">
                    ${objectives.map(obj => this.renderOkrCard(obj)).join('')}
                </div>
            </div>
        `;
    }

    renderOkrCard(objective) {
        const ownerName = this.store.getOwnerName(objective.ownerId);
        return `
            <div class="col-12 col-lg-6 col-xl-4">
                <div class="card okr-card h-100">
                    <div class="card-header okr-card-header">
                        <h5 class="card-title mb-0">${objective.title}</h5>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item edit-objective-btn" href="#" data-bs-toggle="modal" data-bs-target="#objectiveModal" data-id="${objective.id}"><i class="bi bi-pencil-fill me-2"></i>Edit</a></li>
                                <li><a class="dropdown-item delete-objective-btn" href="#" data-id="${objective.id}"><i class="bi bi-trash-fill me-2"></i>Delete</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item add-kr-btn" href="#" data-bs-toggle="modal" data-bs-target="#keyResultModal" data-id="${objective.id}"><i class="bi bi-plus-circle-dotted me-2"></i>Add Key Result</a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-body">
                        <small class="text-muted">Owner: ${ownerName}</small>
                        <div class="progress mt-2" role="progressbar">
                            <div class="progress-bar" style="width: ${objective.progress}%;" >
                                <span class="progress-bar-label">${objective.progress}%</span>
                            </div>
                        </div>
                        <hr>
                        <div class="key-results-list">
                            ${objective.keyResults.map(kr => this.renderKeyResult(kr, objective.id)).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderKeyResult(kr, objectiveId) {
        const progress = Math.round(kr.progress);
        return `
            <div class="kr-item">
                <div class="kr-title">${kr.title}</div>
                <div class="kr-progress">
                    <div class="progress" role="progressbar">
                        <div class="progress-bar bg-info" style="width: ${progress}%;">
                             <span class="progress-bar-label">${kr.currentValue} / ${kr.targetValue}</span>
                        </div>
                    </div>
                </div>
                <div class="kr-actions">
                    <a href="#" class="edit-kr-btn" data-bs-toggle="modal" data-bs-target="#keyResultModal" data-obj-id="${objectiveId}" data-kr-id="${kr.id}"><i class="bi bi-pencil"></i></a>
                    <a href="#" class="delete-kr-btn" data-obj-id="${objectiveId}" data-kr-id="${kr.id}"><i class="bi bi-trash"></i></a>
                </div>
            </div>
        `;
    }

    renderSetupWizard(step) {
        const wizardContent = document.getElementById('wizard-content');
        const wizardFooter = document.getElementById('wizard-footer');
        if (step === 1) {
            wizardContent.innerHTML = `<h6>Step 1: Company Details</h6><p>Let's start with the basics...</p><form id="wizard-step1-form"><div class="mb-3"><label for="company-name" class="form-label">Company Name</label><input type="text" class="form-control" id="company-name" required value="eraneos"></div><div class="mb-3"><label for="company-mission" class="form-label">Mission Statement</label><textarea class="form-control" id="company-mission" rows="3" required></textarea></div><div class="mb-3"><label for="company-vision" class="form-label">Vision Statement</label><textarea class="form-control" id="company-vision" rows="3" required></textarea></div></form>`;
            wizardFooter.innerHTML = `<button type="button" class="btn btn-primary" id="wizard-next-btn" data-next-step="2">Next <i class="bi bi-arrow-right"></i></button>`;
        } else if (step === 2) {
             wizardContent.innerHTML = `<h6>Step 2: Define Your Teams</h6><p>List the teams...</p><form id="wizard-step2-form"><div class="mb-3"><textarea class="form-control" id="team-names" rows="5" placeholder="Financial Services\nLife Sciences & Healthcare"></textarea></div></form>`;
            wizardFooter.innerHTML = `<button type="button" class="btn btn-secondary" id="wizard-back-btn" data-prev-step="1"><i class="bi bi-arrow-left"></i> Back</button><button type="button" class="btn btn-success" id="wizard-finish-btn">Finish Setup</button>`;
        }
    }
}
