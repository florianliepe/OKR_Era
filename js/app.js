document.addEventListener('DOMContentLoaded', () => {
    const store = new Store();
    const ui = new UI();
    let currentViewListeners = [];

    function cleanupListeners() {
        currentViewListeners.forEach(({ element, type, handler }) => {
            element.removeEventListener(type, handler);
        });
        currentViewListeners = [];
    }
    
    function main() {
        const currentProject = store.getCurrentProject();
        if (currentProject) {
            loadProject(currentProject);
        } else {
            loadProjectSwitcher();
        }
    }

    function loadProjectSwitcher() {
        cleanupListeners();
        const projects = store.getProjects();
        ui.renderProjectSwitcher(projects);
        const container = document.getElementById('project-list');
        const handler = (e) => {
            const card = e.target.closest('.project-card:not(#create-new-project-card)');
            if (card) {
                store.setCurrentProjectId(card.dataset.projectId);
                main();
            }
            if (e.target.closest('#create-new-project-card')) {
                ui.showModal('newProjectModal');
            }
            const deleteBtn = e.target.closest('.delete-project-btn');
            if (deleteBtn) {
                e.stopPropagation();
                if(confirm('Are you sure you want to permanently delete this project?')) {
                    store.deleteProject(deleteBtn.dataset.projectId);
                    main();
                }
            }
        };
        container.addEventListener('click', handler);
        currentViewListeners.push({ element: container, type: 'click', handler });
        
        const form = document.getElementById('new-project-form');
        const formHandler = e => {
            e.preventDefault();
            const data = {
                projectName: document.getElementById('project-name').value,
                mission: document.getElementById('project-mission').value,
                vision: document.getElementById('project-vision').value,
                teams: document.getElementById('project-teams').value.split('\n').map(t => t.trim()).filter(Boolean)
            };
            const newProject = store.createNewProject(data);
            store.setCurrentProjectId(newProject.id);
            ui.hideModal('newProjectModal');
            main();
        };
        form.addEventListener('submit', formHandler);
        currentViewListeners.push({ element: form, type: 'submit', handler: formHandler });
    }

    function loadProject() {
        cleanupListeners();
        ui.renderMainLayout();
        // Now that main layout exists, add its listeners
        const backBtn = document.getElementById('back-to-projects');
        const backBtnHandler = () => { store.setCurrentProjectId(null); main(); };
        backBtn.addEventListener('click', backBtnHandler);
        currentViewListeners.push({ element: backBtn, type: 'click', handler: backBtnHandler });
        
        // ... (Add all other main app listeners here, e.g., for search, modals, etc.)
        // Each listener should be pushed to currentViewListeners
        
        router();
        window.addEventListener('hashchange', router);
        currentViewListeners.push({ element: window, type: 'hashchange', handler: router });
    }
    
    const router = () => { /* ... router logic ... */ };

    main();
});
