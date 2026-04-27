export async function register() {
    if (process.env.NEXT_RUNTIME === "edge") return

    const { startAutoBackupScheduler } = await import("@/server/autoBackup")
    const { syncProxyNginxRuntime } = await import("@/server/proxyNginx")

    await startAutoBackupScheduler()

    void syncProxyNginxRuntime().catch(error => {
        console.error("[proxy-service] 启动时同步 Nginx 运行态失败", error)
    })
}
