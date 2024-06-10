const { replyNoMention } = require("../func/misc.js");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

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
            const currentWorkingDir = process.cwd();
            console.log(`Current working directory: ${currentWorkingDir}`); // Log the current working directory

            // Move up one level from the current directory
            const parentDir = path.resolve(currentWorkingDir, '..');
            console.log(`Parent directory: ${parentDir}`); // Log the parent directory

            // Check if the parent directory contains a .git folder
            const gitDir = path.join(parentDir, '.git');
            if (!fs.existsSync(gitDir)) {
                console.error(`.git directory not found in ${parentDir}`);
                replyNoMention(message, "Failed to find the .git directory in the parent folder.");
                reject(new Error(".git directory not found in the parent folder."));
                return;
            }

            console.log(`Found .git directory in: ${parentDir}`); // Log the found git directory

            replyNoMention(message, "Pulling latest changes from Git and restarting...").then(() => {
                // Run git pull command in the parent directory
                exec("git pull", { cwd: parentDir }, (error, stdout, stderr) => {
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
