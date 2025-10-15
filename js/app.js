document.addEventListener('DOMContentLoaded', () => {
    const store = new Store();
    const ui = new UI(store);

    // --- ROUTER ---
    const router = () => {
        const hash = window.location.hash || '#explorer';
        const viewId = hash.substring(1) + '-view';
        
        ui.showView(viewId);
        
        switch(viewId) {
            case 'explorer-view':
                ui.renderExplorerView(document.getElementById('search-input').value);
                break;
            case 'cycles-view':
                ui.renderCyclesView();
                break;
            case 'foundation-view':
                ui.renderFoundationView();
                break;
        }
    };
    
    window.addEventListener('hashchange', router);
    
    // --- Initial Render ---
    ui.renderInitialState();
    router();

    // --- EVENT LISTENERS ---
    
    document.getElementById('search-input').addEventListener('input', (e) => {
        if (window.location.hash === '#explorer' || window.location.hash === '') {
            ui.renderExplorerView(e.target.value);
        }
    });

    document.getElementById('cycle-selector-list').addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            store.setActiveCycle(e.target.dataset.id);
            ui.renderNavControls(store.getState());
            ui.renderExplorerView();
        }
    });

    // Delegated listener for form submissions and non-modal clicks
    document.addEventListener('submit', e => {
        if (e.target.id === 'add-cycle-form') {
            e.preventDefault();
            store.addCycle({
                name: document.getElementById('cycle-name').value,
                startDate: document.getElementById('cycle-start-date').value,
                endDate: document.getElementById('cycle-end-date').value,
            });
            ui.renderCyclesView();
            ui.renderNavControls(store.getState());
        }
        if (e.target.id === 'objective-form') {
            e.preventDefault();
            const id = document.getElementById('objective-id').value;
            const data = { title: document.getElementById('objective-title').value, ownerId: document.getElementById('objective-owner').value, notes: document.getElementById('objective-notes').value };
            if (id) store.updateObjective(id, data); else store.addObjective(data);
            ui.objectiveModal.hide();
            ui.renderExplorerView();
        }
        if (e.target.id === 'kr-form') {
            e.preventDefault();
            const objectiveId = document.getElementById('kr-objective-id').value, krId = document.getElementById('kr-id').value;
            const data = { title: document.getElementById('kr-title').value, startValue: document.getElementById('kr-start-value').value, targetValue: document.getElementById('kr-target-value').value, currentValue: document.getElementById('kr-current-value').value };
            if (krId) store.updateKeyResult(objectiveId, krId, data); else store.addKeyResult(objectiveId, data);
            ui.keyResultModal.hide();
            ui.renderExplorerView();
        }
    });

    document.querySelector('.app-wrapper').addEventListener('click', e => {
        if (e.target.closest('#cycles-view')) {
            const button = e.target.closest('button');
            if (button && button.classList.contains('delete-cycle-btn')) {
                 if (confirm('Are you sure?')) { store.deleteCycle(button.dataset.id); ui.renderCyclesView(); ui.renderNavControls(store.getState()); }
            } else if (button && button.classList.contains('set-active-cycle-btn')) {
                store.setActiveCycle(button.dataset.id); ui.renderCyclesView(); ui.renderNavControls(store.getState());
            }
        }
        if (e.target.closest('#foundation-view')) {
            if (e.target.matches('#edit-foundation-btn')) ui.renderFoundationView(true);
            if (e.target.matches('#cancel-foundation-btn')) ui.renderFoundationView(false);
            if (e.target.matches('#save-foundation-btn')) { store.updateFoundation({ mission: document.getElementById('edit-mission').value, vision: document.getElementById('edit-vision').value }); ui.renderFoundationView(false); }
        }
        if (e.target.closest('#explorer-view')) {
            const deleteBtn = e.target.closest('.delete-objective-btn');
            if (deleteBtn) { e.preventDefault(); if (confirm('Are you sure?')) { store.deleteObjective(deleteBtn.dataset.id); ui.renderExplorerView(); } }
            const deleteKrBtn = e.target.closest('.delete-kr-btn');
            if (deleteKrBtn) { e.preventDefault(); store.deleteKeyResult(deleteKrBtn.dataset.objId, deleteKrBtn.dataset.krId); ui.renderExplorerView(); }
        }
    });
    
    // Correct Modal Trigger Listener
    document.addEventListener('show.bs.modal', (e) => {
        const modal = e.target, trigger = e.relatedTarget;
        if (!trigger) return;
        const state = store.getState();
        if (!state) return;
        if (modal.id === 'objectiveModal') {
            const form = document.getElementById('objective-form');
            form.reset();
            const ownerSelect = document.getElementById('objective-owner');
            ownerSelect.innerHTML = `<option value="company">${state.companyName} (Company-wide)</option>${state.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}`;
            if (trigger.id === 'add-objective-btn') {
                 document.getElementById('objective-modal-title').textContent = 'Add Objective';
                 document.getElementById('objective-id').value = '';
            } else if (trigger.classList.contains('edit-objective-btn')) {
                 document.getElementById('objective-modal-title').textContent = 'Edit Objective';
                 const objective = state.objectives.find(o => o.id === trigger.dataset.id);
                 document.getElementById('objective-id').value = objective.id;
                 document.getElementById('objective-title').value = objective.title;
                 document.getElementById('objective-owner').value = objective.ownerId;
                 document.getElementById('objective-notes').value = objective.notes;
            }
        }
        if (modal.id === 'keyResultModal') {
            const form = document.getElementById('kr-form');
            form.reset();
            if (trigger.classList.contains('add-kr-btn')) {
                document.getElementById('kr-modal-title').textContent = 'Add Key Result';
                document.getElementById('kr-objective-id').value = trigger.dataset.id; 
                document.getElementById('kr-id').value = '';
            } else if (trigger.classList.contains('edit-kr-btn')) {
                document.getElementById('kr-modal-title').textContent = 'Edit Key Result';
                const { objId, krId } = trigger.dataset;
                const kr = state.objectives.find(o => o.id === objId).keyResults.find(k => k.id === krId);
                document.getElementById('kr-objective-id').value = objId;
                document.getElementById('kr-id').value = krId;
                document.getElementById('kr-title').value = kr.title;
                document.getElementById('kr-start-value').value = kr.startValue;
                document.getElementById('kr-target-value').value = kr.targetValue;
                document.getElementById('kr-current-value').value = kr.currentValue;
            }
        }
    });

    // Other Listeners
    let wizardData = {};
    document.getElementById('setupWizardModal').addEventListener('click', (e) => { /* unchanged */ });
    document.getElementById('import-excel').addEventListener('change', (e) => { /* unchanged */ });
    document.getElementById('export-excel-btn').addEventListener('click', (e) => { /* unchanged */ });
    window.addEventListener('okr-data-changed', () => { router(); });
});
