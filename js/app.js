document.addEventListener('DOMContentLoaded', () => {
    const store = new Store();
    const ui = new UI();
    let activeView = null; // To track current view and its listeners

    // --- Main Application Flow ---
    function main() {
        const currentProject = store.getCurrentProject();
        if (currentProject) {
            loadProject(currentProject);
        } else {
            loadProjectSwitcher();
        }
    }

    function loadProjectSwitcher() {
        const projects = store.getProjects();
        ui.renderProjectSwitcher(projects);
        addProjectSwitcherListeners();
        activeView = 'switcher';
    }

    function loadProject(project) {
        ui.renderMainLayout(project);
        addMainAppListeners(project);
        router(); // Start the router for the main app
        activeView = 'main';
    }
    
    // --- Router (for main app) ---
    const router = () => {
        // ... router logic ...
    };

    // --- Event Listener Management ---
    function addProjectSwitcherListeners() {
        const container = document.getElementById('app-container');
        container.addEventListener('click', handleProjectSwitcherClick);
        document.getElementById('new-project-form').addEventListener('submit', handleNewProjectSubmit);
    }
    
    function addMainAppListeners(project) {
        // Attach all listeners for the main app (search, modals, etc.)
        // These listeners will only be active when a project is loaded
    }
    
    // --- Event Handlers ---
    function handleProjectSwitcherClick(e) { /* ... */ }
    function handleNewProjectSubmit(e) { /* ... */ }
    
    main(); // Start the application
});
