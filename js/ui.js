class UI {
    constructor(store) {
        this.store = store;
        this.appContainer = document.getElementById('app-container');
        this.wizardModal = new bootstrap.Modal(document.getElementById('setupWizardModal'));
        this.objectiveModal = new bootstrap.Modal(document.getElementById('objectiveModal'));
        this.keyResultModal = new bootstrap.Modal(document.getElementById('keyResultModal'));
    }

    render() {
        const state = this.store.getState();
        if (!state) {
            this.renderSetupWizard(1);
            this.wizardModal.show();
        } else {
            document.getElementById('add-objective-btn').disabled = false;
            this.renderOkrExplorer(state);
        }
    }

    renderOkrExplorer(state) {
        const activeCycleId = state.cycles.find(c => c.status === 'Active').id;
        const objectives = state.objectives.filter(o => o.cycleId === activeCycleId);

        const companyObjectives = objectives.filter(o => o.ownerId === 'company');
        let html = this.renderObjectiveGroup(state.companyName, companyObjectives);

        state.teams.forEach(team => {
            const teamObjectives = objectives.filter(o => o.ownerId === team.id);
            // Only render the team section if it has objectives
            if (teamObjectives.length > 0) {
                html += this.renderObjectiveGroup(team.name, teamObjectives, team.id);
            }
        });
        
        this.appContainer.innerHTML = html || '<div class="text-center p-5 bg-body-secondary rounded"><h3>No Objectives Yet</h3><p>Click "Add Objective" to get started.</p></div>';
    }

    renderObjectiveGroup(groupName, objectives, ownerId = 'company') {
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
            wizardContent.innerHTML = `
                <h6>Step 1: Company Details</h6>
                <p>Let's start with the basics. What is your company's name and its guiding principles?</p>
                <form id="wizard-step1-form">
                    <div class="mb-3">
                        <label for="company-name" class="form-label">Company Name</label>
                        <input type="text" class="form-control" id="company-name" required value="eraneos">
                    </div>
                    <div class="mb-3">
                        <label for="company-mission" class="form-label">Mission Statement</label>
                        <textarea class="form-control" id="company-mission" rows="3" required></textarea>
                    </div>
                     <div class="mb-3">
                        <label for="company-vision" class="form-label">Vision Statement</label>
                        <textarea class="form-control" id="company-vision" rows="3" required></textarea>
                    </div>
                </form>
            `;
            wizardFooter.innerHTML = `<button type="button" class="btn btn-primary" id="wizard-next-btn" data-next-step="2">Next <i class="bi bi-arrow-right"></i></button>`;
        } else if (step === 2) {
             wizardContent.innerHTML = `
                <h6>Step 2: Define Your Teams</h6>
                <p>List the teams or departments that will have their own OKRs. Enter one team name per line.</p>
                <form id="wizard-step2-form">
                    <div class="mb-3">
                        <textarea class="form-control" id="team-names" rows="5" placeholder="Financial Services\nLife Sciences & Healthcare\nData, AI & Automation"></textarea>
                    </div>
                </form>
            `;
            wizardFooter.innerHTML = `
                <button type="button" class="btn btn-secondary" id="wizard-back-btn" data-prev-step="1"><i class="bi bi-arrow-left"></i> Back</button>
                <button type="button" class="btn btn-success" id="wizard-finish-btn">Finish Setup</button>
            `;
        }
    }
}
