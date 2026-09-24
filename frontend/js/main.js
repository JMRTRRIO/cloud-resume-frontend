// Wait for the HTML to fully load before running any scripts
window.addEventListener('DOMContentLoaded', (event) => {
    
    // 1. RUN THE VISITOR COUNTER
    getVisitorCount();

    // 2. SET THE DYNAMIC COPYRIGHT YEAR
    setCopyrightYear();

    // 3. SETUP THE MOBILE MENU TOGGLE
    setupMobileMenu();

    // 4. FETCH GITHUB PROJECTS AND DISPLAY THEM
    fetchGitHubProjects();

    // 5. SETUP THE CONTACT FORM HANDLER
    setupContactForm();

});

// ==========================================
// FEATURE 1: Visitor Counter (with Session Storage Caching)
// ==========================================
async function getVisitorCount() {
    const awsCounterApiUrl = "https://qgrl762mc0.execute-api.ap-southeast-1.amazonaws.com/counter";
    const counterElement = document.getElementById("counter");
    
    // STEP 1: Check if we already fetched the count during this visit
    let savedCount = sessionStorage.getItem("visitorCount");

    if (savedCount) {
        // We already incremented the DB this session, just show the saved number!
        console.log("Count retrieved from session storage.");
        counterElement.innerText = savedCount;
        return; // Exit the function early
    }

    // STEP 2: If no count is saved, reach out to the API to increment and get the new number
    try {
        const response = await fetch(awsCounterApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        const count = data.number;

        // Display the number
        counterElement.innerText = count; 
        
        // Save the number to Session Storage so it doesn't increment on refresh!
        sessionStorage.setItem("visitorCount", count);

    } catch (error) {
        console.error("Error fetching the visitor count:", error);
        counterElement.innerText = "Offline";
    }
}
// ==========================================
// FEATURE 2: Dynamic Copyright Year 
// ==========================================
function setCopyrightYear() {
    // new Date().getFullYear() looks at the user's computer clock and grabs the 4-digit year.
    const currentYear = new Date().getFullYear();
    
    // Find the empty <span id="year"> and inject the number into it.
    document.getElementById("year").innerText = currentYear;
}

// ==========================================
// FEATURE 3: Mobile Hamburger Menu
// ==========================================
function setupMobileMenu() {
    // 1. Grab the button and the hidden menu using their IDs
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // 2. Tell the button to listen for a "click" from the user's mouse/finger
    menuBtn.addEventListener('click', () => {
        // 3. When clicked, toggle the word 'hidden' on and off in the menu's class list!
        mobileMenu.classList.toggle('hidden');
    });
}


// ==========================================
// FEATURE 4: Automate GitHub Projects (with Session Storage Caching)
// ==========================================
async function fetchGitHubProjects() {
    const container = document.getElementById('github-projects');
    if (!container) return; // Stop if we aren't on the projects page

    const username = "JMRTRRIO";
    const gitApiUrl = `https://api.github.com/users/${username}/repos?sort=updated&direction=desc`;
    const cacheKey = `github_repos_${username}`;

    // Helper function to render the UI from repository data
    function displayRepos(repos) {
        // Clear the "Fetching..." text
        container.innerHTML = "";

        const hiddenRepos = ["JMRTRRIO", "another-repo-to-hide"];

        repos.forEach(repo => {
            if (repo.fork) return; 
            if (hiddenRepos.includes(repo.name)) return;

            const date = new Date(repo.updated_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });

            let badgeColor = "bg-stone-200 text-stone-800";
            if (repo.language === "Python") badgeColor = "bg-blue-100 text-blue-800";
            if (repo.language === "HTML") badgeColor = "bg-orange-100 text-orange-800";
            if (repo.language === "Java") badgeColor = "bg-red-100 text-red-800";

            const cardHTML = `
                <a href="${repo.html_url}" target="_blank" class="group flex flex-col justify-between bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                    <div>
                        <div class="flex justify-between items-start mb-4 gap-2">
                            <h3 class="font-bold text-xl text-stone-800 leading-tight group-hover:text-teal-700 transition-colors line-clamp-2">
                                ${repo.name.replace(/-/g, ' ')}
                            </h3>
                            <span class="text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${badgeColor}">
                                ${repo.language || 'Code'}
                            </span>
                        </div>
                        <p class="text-stone-600 text-sm mb-6 leading-relaxed line-clamp-3">
                            ${repo.description || 'No description provided.'}
                        </p>
                    </div>
                    <div class="text-xs text-stone-400 font-semibold uppercase tracking-wider">
                        Updated ${date}
                    </div>
                </a>
            `;
            container.innerHTML += cardHTML;
        });
    }

    try {
        // 1. Check if we already have the data cached in this tab session
        const cachedData = sessionStorage.getItem(cacheKey);

        if (cachedData) {
            console.log("Loading GitHub data from sessionStorage cache...");
            const repos = JSON.parse(cachedData);
            displayRepos(repos);
            return; // Exit early, no network call needed!
        }

        // 2. If no cache exists, make the network request to GitHub
        console.log("Cache miss. Fetching fresh data from GitHub API...");
        const response = await fetch(gitApiUrl);
        
        if (!response.ok) {
            throw new Error(`GitHub API returned status: ${response.status}`);
        }

        const repos = await response.json();

        // 3. Save the stringified array into sessionStorage for next time
        sessionStorage.setItem(cacheKey, JSON.stringify(repos));

        // 4. Render the UI
        displayRepos(repos);

    } catch (error) {
        console.error("Error fetching GitHub repos:", error);
        container.innerHTML = `<p class="text-red-500 col-span-full">Failed to load projects. Please check my GitHub profile directly!</p>`;
    }
}


// ==========================================
// FEATURE 5: Contact Form Submission
// ==========================================
function setupContactForm() {
    // Locate the contact form on the page. 
    // If no form exists on the current page, exit early to prevent script errors.
    const contactForm = document.querySelector('form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (event) => {
        // Prevent the default browser form submission, which would cause a page reload
        event.preventDefault();

        // Check localStorage to see if the user recently submitted a message
        const lastSentStr = localStorage.getItem('messageSentTimestamp');

        if (lastSentStr) {
            const lastSentTime = parseInt(lastSentStr, 10);
            const currentTime = Date.now();
            const cooldownPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds

            // If the 5-minute cooldown hasn't expired, block the submission and alert the user
            if (currentTime - lastSentTime < cooldownPeriod) {
                alert("You've already sent a message recently! Please wait a bit before sending another.");
                return; 
            }
        }

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Disable the button and update text to provide immediate feedback to the user
        submitBtn.innerHTML = "Sending...";
        submitBtn.disabled = true;

        // Extract the current values from the form inputs
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };

        const awsEmailApiUrl = "https://n5z7ta453e.execute-api.ap-southeast-1.amazonaws.com/contact";

        try {
            // Send the JSON payload to the AWS API Gateway endpoint
            const response = await fetch(awsEmailApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Success: Clear the form fields and show a success message
                contactForm.reset();
                submitBtn.innerHTML = "Message Sent! ✓";
                submitBtn.classList.replace('bg-amber-600', 'bg-green-600');
                
                // Record the time of this successful submission for the cooldown check
                localStorage.setItem('messageSentTimestamp', Date.now().toString());
            } else {
                throw new Error("Server rejected the request");
            }
        } catch (error) {
            // Error: Log the issue for debugging and notify the user visually
            console.error("Failed to send message:", error);
            submitBtn.innerHTML = "Error Sending. Try Again.";
            submitBtn.classList.replace('bg-amber-600', 'bg-red-600');
        }

        // Wait 3 seconds, then restore the button to its original, clickable state
        setTimeout(() => {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            
            // Strip away temporary success/error colors and re-apply the default theme color
            submitBtn.classList.remove('bg-green-600', 'bg-red-600');
            submitBtn.classList.add('bg-amber-600');
        }, 3000);
    });
}