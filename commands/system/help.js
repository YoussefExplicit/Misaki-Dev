const Command = require(`${process.cwd()}/base/Command.js`);
const { MessageEmbed } = require("discord.js");
const EMOJIS = ["⏮", "◀", "⏹", "▶", "⏭", "🔢"];
const perpage = 10;
const joke = require('../../../Doyle-API/index.js')
class Help extends Command {
  constructor(client) {
    super(client, {
      name: "help",
      description: "Get help on a command, command category, or a setting",
      extended: "This command will display all available commands for your permission level, with the additonal option of getting per command information when you run 'help <command name>'.",
      category: "System",
      usage: "help <category/command/setting>",
      aliases: ["h", "halp", "commands"]
    });
  }

  async pages(helpmessage, pagenumber, sorted, type, level, reactions, direction) {
    let num = 0;
    let output = "";    
    const pg = Number(pagenumber);
    for (const cmd of sorted.values()) {
      if (cmd.help.category.toLowerCase() === type) {
        if (num < perpage * pg && num > perpage * pg - (perpage + 1)) {
          output += `\n\`${this.client.settings.get(helpmessage.guild.id).prefix + cmd.help.name}\` | ${cmd.help.description.length > 80 ? `${cmd.help.description.slice(0, 80)}...` : cmd.help.description}`;
        }
        num++;
      }
    }
    if (direction === "forward" && pg > Math.ceil(num / perpage)) return;
    if (direction === "backward" && pg === 0) return;
    console.log(output)
    return output;
    /*const helpembed = new MessageEmbed()
      .setTitle(`Page ${pg}/${Math.ceil(num / perpage)} for ${type.toProperCase()}`)
      .setDescription(`A list of commands in the ${type} category.\n(Total of ${num} commands in this category)\n\nTo get help on a specific command do \`${this.client.settings.get(helpmessage.guild.id).prefix}help <command>\``)
      .addField("Commands", output)
      .setColor(helpmessage.guild.me.roles.highest.color || 5198940)
      .setFooter(helpmessage.embeds[0].footer.text, helpmessage.embeds[0].footer.iconURL);
      return helpembed;*/
  }

  async run(message, [type, page = 1], level) {
    console.log(await joke.yomomma())
    let num = 0;    
    if (type) type = type.toLowerCase();
    const helpembed = new MessageEmbed()
      .setTimestamp()
      .setColor(message.guild.me.roles.highest.color || 5198940)
      .setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL());

    const sorted = this.client.commands.sort((p, cmd) => (p.help.category > cmd.help.category ? 1 : p.help.name > cmd.help.name && p.help.category === cmd.help.category ? 1 : -1)).filter(c => !(level < 10 && c.help.category == "Owner"));
    if (!type) {
      let output = "";
      const description = `Command category list\n\nUse \`${message.settings.prefix}help <category>\` to find commands for a specific category`;
      const categories = this.client.commands.map(c => c.help.category).unique();
      for (let i = 0; i < categories.length; i++) { 
        output += `\n\`${message.settings.prefix}help ${categories[i].toProperCase()}\` | Shows ${categories[i].toProperCase()} commands`;
      }
      helpembed.setDescription(description)
        .addField("Categories", output);
    } else {
      let output = "";
      const pg = Number(page);
      for (const cmd of sorted.values()) {
        if (cmd.help.category.toLowerCase() === type) {
          if (cmd.help.category === "NSFW" && !message.channel.nsfw) return;
          if (num < perpage * pg && num > perpage * pg - (perpage + 1)) {
            if (level < this.client.levelCache[cmd.conf.permLevel]) return;
            output += `\n\`${message.settings.prefix + cmd.help.name}\` | ${cmd.help.description.length > 80 ? `${cmd.help.description.slice(0, 80)}...` : cmd.help.description}`;
          }
          num++;
        }
      }

      if (num) {
        helpembed.setTitle(`Page ${page}/${Math.ceil(num / perpage)} for ${type.toProperCase()}`)
          .setDescription(`A list of commands in the ${type} category.\n(Total of ${num} commands in this category)\n\nTo get help on a specific command do \`${message.settings.prefix}help <command>\``)
          .addField("Commands", output);
      }
    }

    if (this.client.commands.has(type) || this.client.aliases.has(type)) {
      const cm = this.client.commands.get(type) || this.client.commands.get(this.client.aliases.get((type)));
      if (level < this.client.levelCache[cm.conf.permLevel]) return;
      helpembed.setTitle(cm.help.name)
        .addField("Command description", cm.help.description)
        .addField("Command usage", `\`${cm.help.usage}\``)
        .addField("Command aliases", cm.conf.aliases.length ? "None" : cm.conf.aliases.join(", "));
    }
    const msg2 = await message.channel.send(helpembed);
    const totalpages = Math.ceil(num / perpage);
    if (!message.guild.me.hasPermission(["MANAGE_MESSAGES"])) {
      await message.channel.send("I don't have permission to remove reactions, please do this manually.");
    }

    if (msg2.embeds[0].title && msg2.embeds[0].title.includes("Page") && totalpages > 1) {
      for (const emoji of EMOJIS) await msg2.react(emoji);
    }

    const select = msg2.createReactionCollector(
      (reaction, user) => EMOJIS.includes(reaction.emoji.name) && user.id === message.author.id,
      { time: 30000 }
    );

    let on = false;
    select.on("collect", async (r) => {
      const currentpage = Number(msg2.embeds[0].title.split(" ")[1].split("/")[0]);
      switch (r.emoji.name) {
        case "▶":
          await r.users.remove(message.author);
          const nextPageEmbed = new MessageEmbed()
          .setTitle(`Page ${Number(currentpage) + 1}/${Math.ceil(num / perpage)} for ${type.toProperCase()}`)
          .setDescription(`A list of commands in the ${type} category.\n(Total of ${num} commands in this category)\n\nTo get help on a specific command do \`${message.settings.prefix}help <command>\``)
          .addField("Commands", await this.pages(msg2, currentpage + 1, sorted, type, level, r, "forward"))
          .setColor(message.guild.me.roles.highest.color || 5198940)
          .setFooter(`Requested by: ${message.author.tag}`, message.author.displayAvatarURL());
          msg2.edit(nextPageEmbed);
          break;
        case "◀":
          await r.users.remove(message.author);
          const backPageEmbed = new MessageEmbed()
          .setTitle(`Page ${Number(currentpage) - 1}/${Math.ceil(num / perpage)} for ${type.toProperCase()}`)
          .setDescription(`A list of commands in the ${type} category.\n(Total of ${num} commands in this category)\n\nTo get help on a specific command do \`${message.settings.prefix}help <command>\``)
          .addField("Commands", await this.pages(msg2, currentpage - 1, sorted, type, level, r, "forward"))
          .setColor(message.guild.me.roles.highest.color || 5198940)
          .setFooter(`Requested by: ${message.author.tag}`, message.author.displayAvatarURL());
          msg2.edit(backPageEmbed);
          break;
        case "⏮":
          await r.users.remove(message.author);
          const firstPageEmbed = new MessageEmbed()
          .setTitle(`Page 1/${Math.ceil(num / perpage)} for ${type.toProperCase()}`)
          .setDescription(`A list of commands in the ${type} category.\n(Total of ${num} commands in this category)\n\nTo get help on a specific command do \`${message.settings.prefix}help <command>\``)
          .addField("Commands", await this.pages(msg2, currentpage + 1, sorted, type, level, r, "forward"))
          .setColor(message.guild.me.roles.highest.color || 5198940)
          .setFooter(`Requested by: ${message.author.tag}`, message.author.displayAvatarURL());
          msg2.edit(embed);
          break;
        case "⏭":
          await r.users.remove(message.author);
          msg2.edit(await this.pages(msg2, totalpages, sorted, type, level, r, "forward"));
          //embed.setFooter(`Requested by: ${message.author.tag}`, message.author.displayAvatarURL());
          break;
        case "⏹":
          select.stop();
          r.message.reactions.removeAll();
          break;
        case "🔢": {
          await r.users.remove(message.author);
          if (on) return;
          on = true;
          await r.message.channel.send(`Please enter a selection from 1 to ${totalpages}`);
          const whichpage = await message.channel.awaitMessages(m => !isNaN(m.content) && m.author.id === message.author.id, {
            max: 1,
            time: 300000,
            errors: ["time"]
          });
          const pagenumber = Number(whichpage.first().content);
          msg2.edit(await this.pages(msg2, pagenumber, sorted, type, level, r));
          //embed.setFooter(`Requested by: ${message.author.tag}`, message.author.displayAvatarURL());
          on = false;
          break;
        }
      }
    });

    select.on("end", (r, reason) => {
      if (reason === "time") {
        msg2.reactions.removeAll();
      }
    });
  }
}

Array.prototype.unique = function() {
  return [...new Set(this)];
};

module.exports = Help;