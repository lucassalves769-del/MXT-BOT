const { REST, Routes, SlashCommandBuilder } = require('discord.js')

const commands = [

  new SlashCommandBuilder()
    .setName('criar_produto')
    .setDescription('Criar produto')
    .addStringOption(o => o.setName('nome').setRequired(true))
    .addNumberOption(o => o.setName('preco').setRequired(true))
    .addIntegerOption(o => o.setName('estoque').setRequired(true))
    .addStringOption(o => o.setName('descricao').setRequired(true)),

  new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Abrir loja'),

  new SlashCommandBuilder()
    .setName('criar_cupom')
    .setDescription('Criar cupom')
    .addStringOption(o => o.setName('codigo').setRequired(true))
    .addIntegerOption(o => o.setName('desconto').setRequired(true)),

].map(cmd => cmd.toJSON())

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN)

rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands }
).then(() => console.log("✅ Comandos registrados"))
