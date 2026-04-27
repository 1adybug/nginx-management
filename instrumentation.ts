export async function register() {
    if (process.env.NEXT_RUNTIME === "edge") return

    const { startAutoBackupScheduler } = await import("@/server/autoBackup")

    await startAutoBackupScheduler()
}
