import { Link } from 'react-router-dom'
import { PageHeading } from '@/shared/ui/v4/Elements'
export function AboutV4() {
  return (
    <>
      <PageHeading
        title="生活是你的，记录也是。"
        action={
          <Link className="text-button" to="/settings">
            返回设置
          </Link>
        }
      />
      <div className="v4-about-copy">
        <h2>本地优先</h2>
        <p>
          记录保存在本机浏览器的
          IndexedDB。没有账号、业务服务器、云同步或分析追踪。离线缓存只保存应用外壳，生活记录不会进入缓存。
        </p>
        <h2>备份掌握在你手里</h2>
        <p>
          导出文件包含全部新版数据和未结束的专注。请把文件放在自己信任的位置；浏览器下载或系统分享不等于已同步到云端。恢复会先校验、预览，确认后才替换新版数据。
        </p>
        <Link className="button" to="/settings/backup">
          管理备份
        </Link>
        <h2>全新的 4.0</h2>
        <p>
          新版独立保存记录，不读取、迁移或删除旧版数据库。仅支持新版导出的专用备份，不接收旧版文件。
        </p>
        <h2>你的节奏</h2>
        <p>
          习惯日历保留真实完成，不推测过去缺勤；日期记录不编造发生时刻。专注暂停时不累计，收起后继续按设备时间运行。
        </p>
        <p className="muted">
          LifeIndex {__APP_VERSION__} · 字体 Manrope（OFL 1.1），原创界面与 SVG 图形。
        </p>
      </div>
    </>
  )
}
