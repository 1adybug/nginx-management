export async function register() {
    if (process.env.NEXT_RUNTIME === "edge") return

    const { startAutoBackupScheduler } = await import("@/server/autoBackup")
    const { applyProxyServices } = await import("@/server/proxyNginx")

    await startAutoBackupScheduler()

    void applyProxyServices().catch(error => {
        console.error("[proxy-service] 启动时生效 Nginx 配置失败", error)
    })
}
