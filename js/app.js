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

    document.getElementById('cycles-view').addEventListener('click', (e) => {
        const form = e.target.closest('#add-cycle-form');
        if (form) {
            form.addEventListener('submit', event => {
                event.preventDefault();
                store.addCycle({
                    name: document.getElementById('cycle-name').value,
                    startDate: document.getElementById('cycle-start-date').value,
                    endDate: document.getElementById('cycle-end-date').value
                });
                ui.renderCyclesView();
                ui.renderNavControls(store.getState());
            }, { once: true });
        }
        const button = e.target.closest('button');
        if (!button) return;
        const id = button.dataset.id;
        if (button.classList.contains('delete-cycle-btn')) {
             if (confirm('Are you sure? This cannot be undone.')) {
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
