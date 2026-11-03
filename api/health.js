module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN)
  });
};
