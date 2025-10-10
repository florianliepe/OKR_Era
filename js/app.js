document.addEventListener('DOMContentLoaded', () => {
    const store = new Store();
    const ui = new UI(store);
    
    // Initial Render
    ui.render();

    // --- Event Listeners ---

    // Variable to hold data between wizard steps
    let wizardData = {};

    // Wizard Navigation
    document.getElementById('setupWizardModal').addEventListener('click', (e) => {
        if (e.target.matches('#wizard-next-btn')) {
            const form = document.getElementById('wizard-step1-form');
            if (form.checkValidity()) {
                // Save data from step 1 before proceeding
                wizardData.companyName = document.getElementById('company-name').value;
                wizardData.mission = document.getElementById('company-mission').value;
                wizardData.vision = document.getElementById('company-vision').value;

                const nextStep = e.target.dataset.nextStep;
                ui.renderSetupWizard(parseInt(nextStep));
            } else {
                form.reportValidity();
            }
        }
        if (e.target.matches('#wizard-back-btn')) {
            const prevStep = e.target.dataset.prevStep;
            ui.renderSetupWizard(parseInt(prevStep));
        }
        if (e.target.matches('#wizard-finish-btn')) {
            // Get data from step 2 and combine with stored data
            const teamNames = document.getElementById('team-names').value
                .split('\n')
                .map(t => t.trim())
                .filter(t => t);
            
            const finalData = {
                ...wizardData,
                teams: teamNames
            };
            
            store.initializeAppState(finalData);
            ui.wizardModal.hide();
            ui.render();
        }
    });

    // Objective Modal Form
    document.getElementById('objective-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('objective-id').value;
        const data = {
            title: document.getElementById('objective-title').value,
            ownerId: document.getElementById('objective-owner').value,
            notes: document.getElementById('objective-notes').value
        };
        if (id) {
            store.updateObjective(id, data);
        } else {
            store.addObjective(data);
        }
        ui.objectiveModal.hide();
        ui.render();
    });
    
    // Key Result Modal Form
    document.getElementById('kr-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const objectiveId = document.getElementById('kr-objective-id').value;
        const krId = document.getElementById('kr-id').value;
        const data = {
            title: document.getElementById('kr-title').value,
            startValue: document.getElementById('kr-start-value').value,
            targetValue: document.getElementById('kr-target-value').value,
            currentValue: document.getElementById('kr-current-value').value
        };
        if (krId) {
            store.updateKeyResult(objectiveId, krId, data);
        } else {
            store.addKeyResult(objectiveId, data);
        }
        ui.keyResultModal.hide();
        ui.render();
    });

    // Delegated listeners for dynamic content
    document.getElementById('app-container').addEventListener('click', (e) => {
        // Delete Objective
        const deleteBtn = e.target.closest('.delete-objective-btn');
        if (deleteBtn) {
            e.preventDefault();
            const id = deleteBtn.dataset.id;
            if (confirm('Are you sure you want to delete this objective and all its key results?')) {
                store.deleteObjective(id);
                ui.render();
            }
        }
        
        // Delete Key Result
        const deleteKrBtn = e.target.closest('.delete-kr-btn');
        if (deleteKrBtn) {
            e.preventDefault();
            const { objId, krId } = deleteKrBtn.dataset;
            store.deleteKeyResult(objId, krId);
            ui.render();
        }
    });
    
    // Modal Open triggers
    document.addEventListener('show.bs.modal', (e) => {
        const modal = e.target;
        const trigger = e.relatedTarget;
        
        if (modal.id === 'objectiveModal') {
            const form = document.getElementById('objective-form');
            form.reset();
            const state = store.getState();
            const ownerSelect = document.getElementById('objective-owner');
            ownerSelect.innerHTML = `<option value="company">${state.companyName} (Company-wide)</option>` +
                state.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
                
            if (trigger && trigger.classList.contains('edit-objective-btn')) {
                 document.getElementById('objective-modal-title').textContent = 'Edit Objective';
                 const objective = state.objectives.find(o => o.id === trigger.dataset.id);
                 document.getElementById('objective-id').value = objective.id;
                 document.getElementById('objective-title').value = objective.title;
                 document.getElementById('objective-owner').value = objective.ownerId;
                 document.getElementById('objective-notes').value = objective.notes;
            } else {
                 document.getElementById('objective-modal-title').textContent = 'Add Objective';
                 document.getElementById('objective-id').value = '';
            }
        }
        
        if (modal.id === 'keyResultModal') {
            const form = document.getElementById('kr-form');
            form.reset();
            const state = store.getState();
            
            if(trigger && trigger.classList.contains('add-kr-btn')) {
                document.getElementById('kr-modal-title').textContent = 'Add Key Result';
                document.getElementById('kr-objective-id').value = trigger.dataset.id;
                document.getElementById('kr-id').value = '';
            }
             if(trigger && trigger.classList.contains('edit-kr-btn')) {
                document.getElementById('kr-modal-title').textContent = 'Edit Key Result';
                const { objId, krId } = trigger.dataset;
                const objective = state.objectives.find(o => o.id === objId);
                const kr = objective.keyResults.find(k => k.id === krId);

                document.getElementById('kr-objective-id').value = objId;
                document.getElementById('kr-id').value = krId;
                document.getElementById('kr-title').value = kr.title;
                document.getElementById('kr-start-value').value = kr.startValue;
                document.getElementById('kr-target-value').value = kr.targetValue;
                document.getElementById('kr-current-value').value = kr.currentValue;
            }
        }
    });

    // Listen for the custom event from the Chatbot API
    window.addEventListener('okr-data-changed', () => {
        console.log('Data changed via API, re-rendering...');
        ui.render();
    });
});
