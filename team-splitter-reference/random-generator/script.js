document.addEventListener('DOMContentLoaded', () => {
    const namesInput = document.getElementById('names-input');
    const splitBtn = document.getElementById('split-btn');
    const counter = document.getElementById('counter');
    const errorMessage = document.getElementById('error-message');
    const resultsSection = document.getElementById('results');
    const actionsSection = document.getElementById('actions');
    const blueList = document.getElementById('blue-list');
    const redList = document.getElementById('red-list');
    const resetBtn = document.getElementById('reset-btn');
    const reshuffleBtn = document.getElementById('reshuffle-btn');

    let currentNames = [];

    // Update counter on input
    namesInput.addEventListener('input', () => {
        const lines = namesInput.value.split('\n').filter(line => line.trim() !== '');
        counter.textContent = `${lines.length}/10`;
        
        if (lines.length > 10) {
            counter.style.color = '#ef4444';
        } else if (lines.length === 10) {
            counter.style.color = '#4ade80';
        } else {
            counter.style.color = 'var(--text-muted)';
        }
    });

    const getNames = () => {
        return namesInput.value
            .split('\n')
            .map(name => name.trim())
            .filter(name => name !== '');
    };

    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const displayTeams = (names) => {
        const shuffled = shuffleArray(names);
        const blueTeam = shuffled.slice(0, 5);
        const redTeam = shuffled.slice(5, 10);

        // Clear existing lists
        blueList.innerHTML = '';
        redList.innerHTML = '';

        // Add to DOM
        blueTeam.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            blueList.appendChild(li);
        });

        redTeam.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            redList.appendChild(li);
        });

        // Hide input, show results
        document.querySelector('.input-section').classList.add('hidden');
        resultsSection.classList.remove('hidden');
        actionsSection.classList.remove('hidden');
    };

    const handleSplit = () => {
        const names = getNames();
        
        if (names.length !== 10) {
            errorMessage.textContent = `Please enter exactly 10 names. You have entered ${names.length}.`;
            errorMessage.classList.remove('hidden');
            
            // Shake animation for error
            namesInput.style.animation = 'none';
            namesInput.offsetHeight; /* trigger reflow */
            namesInput.style.animation = 'shake 0.5s ease';
            return;
        }

        errorMessage.classList.add('hidden');
        currentNames = names;
        displayTeams(currentNames);
    };

    splitBtn.addEventListener('click', handleSplit);

    reshuffleBtn.addEventListener('click', () => {
        // Re-trigger animation
        resultsSection.classList.remove('hidden');
        void resultsSection.offsetWidth; // trigger reflow
        
        // Remove popIn animation from old items so we can re-trigger
        blueList.innerHTML = '';
        redList.innerHTML = '';
        displayTeams(currentNames);
    });

    resetBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        actionsSection.classList.add('hidden');
        document.querySelector('.input-section').classList.remove('hidden');
        namesInput.value = '';
        counter.textContent = '0/10';
        counter.style.color = 'var(--text-muted)';
        currentNames = [];
    });

    // Add shake animation to CSS dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
});
