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
    
    // Search Input
    document.getElementById('search-input').addEventListener('input', (e) => {
        if (window.location.hash === '#explorer' || window.location.hash === '') {
            ui.renderExplorerView(e.target.value);
        }
    });

    // Cycle Selector Dropdown (in top bar)
    document.getElementById('cycle-selector-list').addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            store.setActiveCycle(e.target.dataset.id);
            ui.renderNavControls(store.getState());
            ui.renderExplorerView();
        }
    });

    // Event delegation for Cycle Management View
    document.getElementById('cycles-view').addEventListener('click', (e) => {
        const form = e.target.closest('#add-cycle-form');
        if (form) {
            form.addEventListener('submit', event => {
                event.preventDefault();
                const data = {
                    name: document.getElementById('cycle-name').value,
                    startDate: document.getElementById('cycle-start-date').value,
                    endDate: document.getElementById('cycle-end-date').value
                };
                store.addCycle(data);
                ui.renderCyclesView();
                ui.renderNavControls(store.getState());
            }, { once: true });
        }

        const button = e.target.closest('button');
        if (!button) return;
        const id = button.dataset.id;
        
        if (button.classList.contains('delete-cycle-btn')) {
             if (confirm('Are you sure you want to delete this cycle and all its objectives? This cannot be undone.')) {
                store.deleteCycle(id);
                ui.renderCyclesView();
                ui.renderNavControls(store.getState());
            }
        } else if (button.classList.contains('set-active-cycle-btn')) {
            store.setActiveCycle(id);
            ui.renderCyclesView();
            ui.renderNavControls(store.getState());
        }
    });

    // Event delegation for Foundation View
    document.getElementById('foundation-view').addEventListener('click', (e) => {
        if (e.target.matches('#edit-foundation-btn')) ui.renderFoundationView(true);
        if (e.target.matches('#cancel-foundation-btn')) ui.renderFoundationView(false);
        if (e.target.matches('#save-foundation-btn')) {
            store.updateFoundation({
                mission: document.getElementById('edit-mission').value,
                vision: document.getElementById('edit-vision').value,
            });
            ui.renderFoundationView(false);
        }
    });
    
    // Excel Import
    document.getElementById('import-excel').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!confirm('IMPORTANT: Importing this file will replace all current OKR data. Are you sure you want to proceed?')) {
            e.target.value = ''; return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                const newState = JSON.parse(JSON.stringify(store.getState()));
                newState.objectives = [];
                const objectivesMap = new Map();
                json.forEach(row => {
                    const objectiveTitle = row["Objective Title"], ownerName = row["Owner"], cycleName = row["Cycle"];
                    const mapKey = `${objectiveTitle}|${ownerName}|${cycleName}`;
                    if (!objectivesMap.has(mapKey)) {
                        const owner = newState.teams.find(t => t.name === ownerName) || {id: 'company'};
                        let cycle = newState.cycles.find(c => c.name === cycleName);
                        if (!cycle) {
                            cycle = {id: `cycle-imported-${Date.now()}`, name: cycleName, status: "Archived", startDate: "", endDate: ""};
                            newState.cycles.push(cycle);
                        }
                        const objective = { id: `obj-${Date.now()}-${Math.random()}`, cycleId: cycle.id, ownerId: owner.id, title: objectiveTitle, notes: "", progress: 0, grade: null, keyResults: [] };
                        newState.objectives.push(objective);
                        objectivesMap.set(mapKey, objective);
                    }
                    const objective = objectivesMap.get(mapKey);
                    if (row["Key Result Title"] && row["Key Result Title"] !== "(No key results)") {
                         objective.keyResults.push({ id: `kr-${Date.now()}-${Math.random()}`, title: row["Key Result Title"], startValue: Number(row["Start Value"] || 0), targetValue: Number(row["Target Value"] || 100), currentValue: Number(row["Current Value"] || 0), progress: 0 });
                    }
                });
                newState.objectives.forEach(obj => obj.progress = store.calculateProgress(obj));
                store.replaceState(newState);
                router();
                ui.renderNavControls(store.getState());
                alert('Import successful!');
            } catch (error) {
                console.error("Import failed:", error);
                alert("Import failed. Please check the Excel file format.");
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    });
    
    // Excel Export
    document.getElementById('export-excel-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const state = store.getState();
        if (!state) return;
        const dataForExport = [];
        state.objectives.forEach(obj => {
            const cycle = state.cycles.find(c => c.id === obj.cycleId);
            const owner = store.getOwnerName(obj.ownerId);
            if (obj.keyResults.length === 0) {
                dataForExport.push({ "Cycle": cycle ? cycle.name : 'N/A', "Owner": owner, "Objective Title": obj.title, "Key Result Title": "(No key results)", "Start Value": "", "Target Value": "", "Current Value": "", "Progress (%)": obj.progress });
            } else {
                obj.keyResults.forEach(kr => {
                    dataForExport.push({ "Cycle": cycle ? cycle.name : 'N/A', "Owner": owner, "Objective Title": obj.title, "Key Result Title": kr.title, "Start Value": kr.startValue, "Target Value": kr.targetValue, "Current Value": kr.currentValue, "Progress (%)": kr.progress });
                });
            }
        });
        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "OKRs");
        XLSX.writeFile(workbook, `OKR_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    });

    // --- PHASE 1 EVENT LISTENERS (UNCHANGED) ---
    let wizardData = {};
    document.getElementById('setupWizardModal').addEventListener('click', (e) => {
        if (e.target.matches('#wizard-next-btn')) {
            const form = document.getElementById('wizard-step1-form');
            if (form.checkValidity()) {
                wizardData.companyName = document.getElementById('company-name').value;
                wizardData.mission = document.getElementById('company-mission').value;
                wizardData.vision = document.getElementById('company-vision').value;
                ui.renderSetupWizard(parseInt(e.target.dataset.nextStep));
            } else { form.reportValidity(); }
        }
        if (e.target.matches('#wizard-back-btn')) ui.renderSetupWizard(parseInt(e.target.dataset.prevStep));
        if (e.target.matches('#wizard-finish-btn')) {
            const teamNames = document.getElementById('team-names').value.split('\n').map(t => t.trim()).filter(t => t);
            store.initializeAppState({ ...wizardData, teams: teamNames });
            ui.wizardModal.hide();
            ui.renderInitialState();
            router();
        }
    });

    document.getElementById('objective-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('objective-id').value;
        const data = { title: document.getElementById('objective-title').value, ownerId: document.getElementById('objective-owner').value, notes: document.getElementById('objective-notes').value };
        if (id) store.updateObjective(id, data);
        else store.addObjective(data);
        ui.objectiveModal.hide();
        ui.renderExplorerView();
    });
    
    document.getElementById('kr-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const objectiveId = document.getElementById('kr-objective-id').value, krId = document.getElementById('kr-id').value;
        const data = { title: document.getElementById('kr-title').value, startValue: document.getElementById('kr-start-value').value, targetValue: document.getElementById('kr-target-value').value, currentValue: document.getElementById('kr-current-value').value };
        if (krId) store.updateKeyResult(objectiveId, krId, data);
        else store.addKeyResult(objectiveId, data);
        ui.keyResultModal.hide();
        ui.renderExplorerView();
    });

    document.getElementById('explorer-view').addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-objective-btn');
        if (deleteBtn) {
            e.preventDefault();
            if (confirm('Are you sure you want to delete this objective?')) {
                store.deleteObjective(deleteBtn.dataset.id);
                ui.renderExplorerView();
            }
        }
        const deleteKrBtn = e.target.closest('.delete-kr-btn');
        if (deleteKrBtn) {
            e.preventDefault();
            const { objId, krId } = deleteKrBtn.dataset;
            store.deleteKeyResult(objId, krId);
            ui.renderExplorerView();
        }
    });
    
    document.addEventListener('show.bs.modal', (e) => {
        const modal = e.target, trigger = e.relatedTarget;
        if (!trigger) return;
        if (modal.id === 'objectiveModal') {
            const form = document.getElementById('objective-form');
            form.reset();
            const state = store.getState();
            const ownerSelect = document.getElementById('objective-owner');
            ownerSelect.innerHTML = `<option value="company">${state.companyName} (Company-wide)</option>${state.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}`;
            if (trigger.classList.contains('edit-objective-btn')) {
                 document.getElementById('objective-modal-title').textContent = 'Edit Objective';
                 const objective = state.objectives.find(o => o.id === trigger.dataset.id);
                 Object.assign(document.forms['objective-form'].elements, { 'objective-id': {value: objective.id}, 'objective-title': {value: objective.title}, 'objective-owner': {value: objective.ownerId}, 'objective-notes': {value: objective.notes} });
            } else {
                 document.getElementById('objective-modal-title').textContent = 'Add Objective';
                 document.getElementById('objective-id').value = '';
            }
        }
        if (modal.id === 'keyResultModal') {
            const form = document.getElementById('kr-form');
            form.reset();
            const state = store.getState();
            if (trigger.classList.contains('add-kr-btn')) {
                document.getElementById('kr-modal-title').textContent = 'Add Key Result';
                document.getElementById('kr-objective-id').value = trigger.dataset.id; 
                document.getElementById('kr-id').value = '';
            } else if (trigger.classList.contains('edit-kr-btn')) {
                document.getElementById('kr-modal-title').textContent = 'Edit Key Result';
                const { objId, krId } = trigger.dataset;
                const kr = state.objectives.find(o => o.id === objId).keyResults.find(k => k.id === krId);
                Object.assign(document.forms['kr-form'].elements, { 'kr-objective-id': {value: objId}, 'kr-id': {value: krId}, 'kr-title': {value: kr.title}, 'kr-start-value': {value: kr.startValue}, 'kr-target-value': {value: kr.targetValue}, 'kr-current-value': {value: kr.currentValue} });
            }
        }
    });

    window.addEventListener('okr-data-changed', () => {
        console.log('Data changed via API, re-rendering...');
        router();
    });
});
