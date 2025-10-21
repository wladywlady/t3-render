import { createApp } from "./app.js";
import { appConfig } from "./config.js";
import { logger } from "./logger.js";
const app = createApp();
app.listen(appConfig.port, () => {
    logger.info(`Servidor escuchando en puerto ${appConfig.port}`);
});
