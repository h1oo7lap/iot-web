import { NavLink } from 'react-router-dom'
import { HiHome } from 'react-icons/hi'
import { HiMiniChartBar } from 'react-icons/hi2'
import { BiHistory } from 'react-icons/bi'
import { BsEmojiSmile } from 'react-icons/bs'

export default function Sidebar() {
    return (
        <div className="sidebar">
            <NavLink to="/" className={({ isActive }) => `sidebar-icon ${isActive ? 'active' : ''}`}>
                <HiHome />
            </NavLink>
            <NavLink to="/data-sensor" className={({ isActive }) => `sidebar-icon ${isActive ? 'active' : ''}`}>
                <HiMiniChartBar />
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `sidebar-icon ${isActive ? 'active' : ''}`}>
                <BiHistory />
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `sidebar-icon ${isActive ? 'active' : ''}`}>
                <BsEmojiSmile />
            </NavLink>
        </div>
    )
}

