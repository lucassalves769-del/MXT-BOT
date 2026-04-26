const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js')

const fs = require('fs')
const PixPayload = require('pix-payload')

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
})

const DB = "./database.json"

function load() {
  return JSON.parse(fs.readFileSync(DB))
}
function save(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2))
}

const CONFIG = {
  pix: process.env.PIX_CHAVE,
  suporte: process.env.SUPORTE_ROLE_ID,
  log: process.env.LOG_CHANNEL_ID
}

// EMOJIS (COLOQUE OS SEUS AQUI)
const EMOJIS = {
  cart: "🛒",
  money: "💰",
  ok: "✅"
}

function gerarPix(valor) {
  return PixPayload({
    key: CONFIG.pix,
    name: "MXT STORE",
    city: "SALVADOR",
    amount: valor,
    transactionId: `MXT${Date.now()}`
  })
}

function log(guild, msg) {
  const canal = guild.channels.cache.get(CONFIG.log)
  if (canal) canal.send(msg)
}

client.on('ready', () => {
  console.log("🔥 MXT STORE PRO ONLINE")
})

// INTERAÇÕES
client.on('interactionCreate', async (interaction) => {

  const db = load()

  // CRIAR PRODUTO
  if (interaction.isChatInputCommand() && interaction.commandName === 'criar_produto') {

    db.produtos[interaction.options.getString('nome')] = {
      preco: interaction.options.getNumber('preco'),
      estoque: interaction.options.getInteger('estoque'),
      descricao: interaction.options.getString('descricao')
    }

    save(db)
    return interaction.reply({ content: "✅ Produto criado!", ephemeral: true })
  }

  // LOJA
  if (interaction.commandName === 'loja') {

    const menu = new StringSelectMenuBuilder()
      .setCustomId('select')
      .setPlaceholder('Escolha um produto')

    Object.keys(db.produtos).forEach(p => {
      menu.addOptions({
        label: p,
        description: db.produtos[p].descricao,
        value: p
      })
    })

    const row = new ActionRowBuilder().addComponents(menu)

    const embed = new EmbedBuilder()
      .setTitle("🛍️ MXT STORE")
      .setDescription("Selecione um produto")
      .setColor("Blue")

    return interaction.reply({ embeds: [embed], components: [row] })
  }

  // CUPOM
  if (interaction.commandName === 'criar_cupom') {

    db.cupons[interaction.options.getString('codigo')] = {
      desconto: interaction.options.getInteger('desconto')
    }

    save(db)
    return interaction.reply({ content: "🎟️ Cupom criado!", ephemeral: true })
  }

  // SELECIONAR PRODUTO
  if (interaction.isStringSelectMenu()) {

    const produto = db.produtos[interaction.values[0]]

    const embed = new EmbedBuilder()
      .setTitle(interaction.values[0])
      .setDescription(produto.descricao)
      .addFields(
        { name: "💰 Preço", value: `R$ ${produto.preco}` },
        { name: "📦 Estoque", value: `${produto.estoque}` }
      )

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`buy_${interaction.values[0]}`)
        .setLabel("Comprar")
        .setStyle(ButtonStyle.Success)
    )

    return interaction.reply({ embeds: [embed], components: [btn], ephemeral: true })
  }

  // COMPRAR
  if (interaction.isButton() && interaction.customId.startsWith("buy_")) {

    const nome = interaction.customId.replace("buy_", "")
    const produto = db.produtos[nome]

    if (produto.estoque <= 0)
      return interaction.reply({ content: "❌ Sem estoque", ephemeral: true })

    const canal = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: CONFIG.suporte, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    })

    const pix = gerarPix(produto.preco)

    const embed = new EmbedBuilder()
      .setTitle("💳 Pagamento Pix")
      .setDescription(`
Produto: **${nome}**
Valor: **R$ ${produto.preco}**

\`\`\`
${pix}
\`\`\`
`)

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_${nome}`)
        .setLabel("Confirmar Pagamento")
        .setStyle(ButtonStyle.Success)
    )

    canal.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [btn]
    })

    log(interaction.guild, `🛒 ${interaction.user.tag} comprando ${nome}`)

    return interaction.reply({ content: "✅ Ticket criado!", ephemeral: true })
  }

  // CONFIRMAR
  if (interaction.isButton() && interaction.customId.startsWith("confirm_")) {

    if (!interaction.member.roles.cache.has(CONFIG.suporte))
      return interaction.reply({ content: "❌ Apenas suporte", ephemeral: true })

    const nome = interaction.customId.replace("confirm_", "")
    const produto = db.produtos[nome]

    produto.estoque--
    save(db)

    const role = interaction.guild.roles.cache.find(r => r.name === nome)
    if (role) {
      await interaction.member.roles.add(role)

      setTimeout(() => {
        interaction.member.roles.remove(role)
      }, 1000 * 60 * 60 * 24 * 7) // 7 dias
    }

    log(interaction.guild, `✅ Pagamento confirmado (${nome})`)

    interaction.reply("✅ Pagamento confirmado!")
  }

})

client.login(process.env.TOKEN)
