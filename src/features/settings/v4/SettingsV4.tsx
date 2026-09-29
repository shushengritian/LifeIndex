import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { PageHeading } from '@/shared/ui/v4/Elements'
import { Icon, type UiIconKey } from '@/shared/ui/v4/Icon'

const destinations: [string, string, string, UiIconKey][] = [
  ['appearance', '外观', '跟随系统，或选择你的明暗', 'sun'],
  ['categories', '分类管理', '让每条记录有自己的位置', 'bag'],
  ['backup', '备份与恢复', '把本机生活，妥善带走', 'download'],
  ['about', '关于与数据安全', '了解记录保存在何处', 'shield'],
]
export function SettingsV4() {
  const services = useV4Services(),
    query = useV4Query(useCallback(() => services.preferences.getAll(), [services]))
  const lastExport = query.snapshot?.data.values.lastExportedAt
  return (
    <>
      <PageHeading title="按你的方式，安放生活。" description="外观、分类与数据，都由你决定。" />
      <ul className="v4-settings-list">
        {destinations.map(([path, title, note, icon]) => (
          <li key={path}>
            <Link to={`/settings/${path}`} data-focus-key={`settings:${path}`}>
              <span className="settings-symbol">
                <Icon name={icon} size={24} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{note}</small>
              </span>
              <Icon name="arrow" size={18} />
            </Link>
          </li>
        ))}
      </ul>
      <section className="v4-data-note">
        <Icon name="shield" size={26} />
        <div>
          <h2>只在这台设备，属于你。</h2>
          <p>
            LifeIndex
            不上传你的记录。清理浏览器站点数据、更换设备或卸载环境可能丢失本机内容，请定期导出备份。
          </p>
          {/* Only a resolved read can assert that no export exists; loading and failure are unknown states. */}
          {query.status === 'loading' ? (
            <p role="status">正在读取备份状态…</p>
          ) : query.status === 'failed' ? (
            <div role="alert">
              <p>暂时读不到备份状态，已有记录没有被改变。</p>
              <button type="button" className="text-button" onClick={query.retry}>
                重试备份状态
              </button>
            </div>
          ) : (
            <p>
              {lastExport
                ? `上次交给浏览器的备份：${new Date(lastExport).toLocaleString('zh-CN')}`
                : '还没有导出过新版备份。'}
            </p>
          )}
        </div>
      </section>
      <p className="v4-version">LifeIndex {__APP_VERSION__} · 本地优先</p>
    </>
  )
}
