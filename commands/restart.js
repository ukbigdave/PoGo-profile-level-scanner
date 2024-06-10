const { replyNoMention } = require("../func/misc.js");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Load the keys from the keys.json file
const keys = require(path.resolve(__dirname, '../server/keys.json'));

module.exports = {
    name: "restart-bot-server",
    description: "Restarts the bot. I haven't (can't) thoroughly tested this, so sorry if it doesn't work",
    aliases: ["rs", "restart", "restart-server"],
    usage: `\`${ops.prefix}rs\``,
    guildOnly: true,
    type: "Admin",
    execute(message) {
        return new Promise(function(resolve, reject) {
            console.log(`${message.author.username}${message.author} force quit the server at ${message.createdAt.toLocaleString()}.`);
            console.log(`Current working directory: ${process.cwd()}`); // Log the current working directory

            const gitRepoPath = keys.dir; // Get the Git repository path from keys.json

            if (!gitRepoPath || !fs.existsSync(path.join(gitRepoPath, '.git'))) {
                console.error(`No git repository found at specified path: ${gitRepoPath}`);
                replyNoMention(message, "Failed to find the git repository at the specified path.");
                reject(new Error("Git repository not found at the specified path."));
                return;
            }

            console.log(`Git repository found at: ${gitRepoPath}`); // Log the found git root directory

            replyNoMention(message, "Pulling latest changes from Git and restarting...").then(() => {
                // Run git pull command in the specified git repository path
                exec("git pull", { cwd: gitRepoPath }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error during git pull: ${error.message}`);
                        replyNoMention(message, `Failed to pull from git: ${error.message}`);
                        reject(error);
                        return;
                    }
                    if (stderr) {
                        console.error(`Git pull stderr: ${stderr}`);
                    }
                    console.log(`Git pull stdout: ${stdout}`);

                    // After git pull, restart the bot
                    resolve();
                    setTimeout(() => {
                        process.exit(0);
                    }, 10);
                });
            });
        });
    },
};
