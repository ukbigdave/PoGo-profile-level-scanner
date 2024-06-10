const { replyNoMention } = require("../func/misc.js");
const { exec } = require("child_process");

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

            replyNoMention(message, "Pulling latest changes from Git and restarting...").then(() => {
                // Run git pull command
                exec("git pull", { cwd: process.cwd() }, (error, stdout, stderr) => {
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
