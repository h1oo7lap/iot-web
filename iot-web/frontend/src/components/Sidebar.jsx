import { HiHome } from 'react-icons/hi'
import { HiMiniChartBar } from 'react-icons/hi2'
import { BiHistory } from 'react-icons/bi'
import { BsEmojiSmile } from 'react-icons/bs'

export default function Sidebar({ active = 'dashboard', onNavigate }) {
    const nav = (page) => onNavigate && onNavigate(page)

    return (
        <div className="sidebar">
            <div className={`sidebar-icon ${active === 'dashboard' ? 'active' : ''}`} onClick={() => nav('dashboard')}>
                <HiHome />
            </div>
            <div className={`sidebar-icon ${active === 'data-sensor' ? 'active' : ''}`} onClick={() => nav('data-sensor')}>
                <HiMiniChartBar />
            </div>
            <div className={`sidebar-icon ${active === 'history' ? 'active' : ''}`} onClick={() => nav('history')}>
                <BiHistory />
            </div>
            <div className={`sidebar-icon ${active === 'profile' ? 'active' : ''}`} onClick={() => nav('profile')}>
                <BsEmojiSmile />
            </div>
        </div>
    )
}

