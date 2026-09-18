async function replyEphemeral(interaction, content) {
  const payload = { content, ephemeral: true };

  try {
    if (interaction.replied || interaction.deferred) {
      if (typeof interaction.followUp === 'function') await interaction.followUp(payload);
      return;
    }
    if (typeof interaction.reply === 'function') await interaction.reply(payload);
  } catch {}
}

/**
 * Creates the interaction boundary for slash commands and existing components.
 * Guards run before every command-bearing interaction so prefix, slash, button,
 * and string-select commands share the same cooldown source.
 */
export function createInteractionHandler({
  commands,
  isAuthorizedGuild,
  handleUnauthorizedGuild,
  checkBotLock,
  checkCooldown,
  handleButtonInteraction,
  logger,
}) {
  return async (interaction) => {
    const isSlashCommand = interaction.isChatInputCommand?.() === true;
    const isComponent = interaction.isButton?.() === true || interaction.isStringSelectMenu?.() === true;
    if (!isSlashCommand && !isComponent) return;
    if (!interaction.guild) return;

    if (!isAuthorizedGuild(interaction.guild)) {
      return handleUnauthorizedGuild(interaction.guild);
    }

    const lockCheck = checkBotLock(interaction.user, interaction.guild);
    if (!lockCheck.allowed) return replyEphemeral(interaction, lockCheck.reason);

    const cooldown = checkCooldown(interaction.user.id, interaction.guild.id);
    if (!cooldown.ok) {
      return replyEphemeral(interaction, `⏳ Chờ **${(cooldown.remainingMs / 1000).toFixed(1)}s**`);
    }

    if (isComponent) return handleButtonInteraction(interaction);

    const command = commands.get(interaction.commandName);
    if (!command?.execute) {
      return replyEphemeral(interaction, '❌ Lệnh này không còn khả dụng.');
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error('Command', `${interaction.commandName}: ${error.message}`);
      return replyEphemeral(interaction, '❌ Đã xảy ra lỗi!');
    }
  };
}
