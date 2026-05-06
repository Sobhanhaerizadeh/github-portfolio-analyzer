const input = document.getElementById("input");
const btn = document.getElementById("btn");
const error = document.getElementById("errorMsg");
const loading = document.getElementById("loading");
const content = document.getElementById("content");

let chart = null;

btn.addEventListener("click", loadUser);

input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        loadUser();
    }
});

async function loadUser() {
    let name = input.value.trim();

    if (name === "") {
        window.alert("Bitte gib einen Namen ein!");
        return;
    }

    error.textContent = "";
    loading.classList.remove("hidden");
    content.classList.add("hidden");

    try {
        let userRes = await fetch(`https://api.github.com/users/${name}`);

        if (userRes.status === 404) {

            throw new Error("Benutzer nicht gefunden.");
        }

        if (userRes.status === 403) {
            throw new Error("API Limit erreicht. Bitte später erneut versuchen.");
        }

        if (!userRes.ok) {
            throw new Error("Fehler beim Laden.");
        }

        let repoRes = await fetch(`https://api.github.com/users/${name}/repos?per_page=100`);

        if (!repoRes.ok) {
            throw new Error("Fehler beim Laden der Repositories.");
        }


        let user = await userRes.json();
        let repos = await repoRes.json();

        document.getElementById("avatar").src = user.avatar_url;
        document.getElementById("name").textContent = user.name || user.login;
        document.getElementById("login").textContent = "@" + user.login;
        document.getElementById("bio").textContent = user.bio || "Keine Bio";
        document.getElementById("reposCount").textContent = user.public_repos;
        document.getElementById("followers").textContent = user.followers;
        document.getElementById("following").textContent = user.following;
        document.getElementById("link").href = user.html_url;

        let languages = {};

        repos.forEach(function (repo) {
            if (!repo.language) return;

            languages[repo.language] = (languages[repo.language] || 0) + 1;
        });

        let sorted = Object.entries(languages).sort(function (a, b) {
            return b[1] - a[1];
        }).slice(0, 5);

        let labels = sorted.map(function (item) {
            return item[0];
        });

        let data = sorted.map(function (item) {
            return item[1];
        });

        if (chart) {
            chart.destroy();
        }

        let ctx = document.getElementById("chart");

        chart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: data
                }]
            }
        });

        let repoBox = document.getElementById("repos");
        repoBox.innerHTML = "";

        repos
            .sort(function (a, b) {
                return b.stargazers_count - a.stargazers_count;
            })
            .slice(0, 6)
            .forEach(function (repo) {
                repoBox.innerHTML += `
                    <div class="col-md-6">
                    <div class="repo-card p-3 h-100">
               <a href="${repo.html_url}" target="_blank">${repo.name}</a>
            <p>${repo.description || "Keine Beschreibung"}</p>
            <span>${repo.language || "Unbekannt"}</span>
                    </div>
                    </div>
                `;
            });

        loading.classList.add("hidden");
        content.classList.remove("hidden");

    } catch (err) {
        loading.classList.add("hidden");
        error.textContent = err.message;
    }
}