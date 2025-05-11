const { createLogger, format, transports } = require("winston");

const logger = createLogger({
	level: "info", // Níveis: error, warn, info, http, verbose, debug, silly
	format: format.combine(
		format.colorize({ all: true }),
		format.timestamp({
			format: "YYYY-MM-DD hh:mm:ss.SSS A",
		}),
		format.align(),
		format.printf(
			(info) =>
				`[${info.timestamp}] ${info.level}: ${info.message}${
					info.stack ? `\nStack: ${info.stack}` : ""
				}`
		) // Formato legível para logs
	),
	transports: [
		// new transports.Console(), // Exibe logs no console
		new transports.File({ filename: "logs/error.log", level: "error" }), // Logs de erros
		new transports.File({ filename: "logs/combined.log" }), // Todos os logs
	],
});

// Se não estiver em produção, exibe logs no console em formato legível
if (process.env.NODE_ENV !== "production") {
	logger.add(
		new transports.Console({
			//   format: format.combine(format.colorize(), format.simple()),
		})
	);
}

module.exports = logger;
