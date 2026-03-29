import { useState, useRef } from 'react'
import { BsEmojiSmile, BsPersonBadge, BsTelephone, BsEnvelope, BsFileEarmarkText } from 'react-icons/bs'
import { FiGithub, FiFigma } from 'react-icons/fi'
import './Profile.css'
import avatarJpg from '../assets/avatar.jpg'

export default function Profile() {
    const [avatar, setAvatar] = useState(avatarJpg)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setAvatar(url)
        }
    }

    return (
        <div className="profile-page">
            <div className="page-header">
                <h1 className="page-title">Profile</h1>
            </div>

            <div className="profile-container">
                {/* 1. Avatar Section */}
                <div className="profile-left">
                    <div className="avatar-wrapper">
                        <img
                            src={avatar}
                            alt="Avatar"
                        />
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button
                        className="change-avatar-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Change avatar
                    </button>
                </div>

                {/* 2. Information Card */}
                <div className="profile-card">
                    <div className="card-title-wrap">
                        <span className="card-title">Information</span>
                    </div>

                    <div className="info-item">
                        <div className="info-label">
                            <BsEmojiSmile /> Name
                        </div>
                        <div className="info-value">Lê Hồng Phú Hưng</div>
                    </div>

                    <div className="info-item">
                        <div className="info-label">
                            <BsPersonBadge /> Student ID
                        </div>
                        <div className="info-value">B22DCPT116</div>
                    </div>

                    <div className="info-item">
                        <div className="info-label">
                            <BsTelephone /> Phone
                        </div>
                        <div className="info-value">0898737792</div>
                    </div>

                    <div className="info-item">
                        <div className="info-label">
                            <BsEnvelope /> Mail
                        </div>
                        <div className="info-value">h1oo7lap@gmail.com</div>
                    </div>
                </div>

                {/* 3. Link Card */}
                <div className="profile-card">
                    <div className="card-title-wrap">
                        <span className="card-title">Link</span>
                    </div>

                    <div className="info-item">
                        <div className="info-label">
                            <FiGithub /> Github
                        </div>
                        <a href="https://github.com/h1oo7lap/iot-web.git" target="_blank" rel="noreferrer" className="info-link">
                            github.com/h1oo7lap/iot-web
                        </a>
                    </div>

                    <div className="info-item">
                        <div className="info-label">
                            <FiFigma /> Figma
                        </div>
                        <a href="https://www.figma.com/design/2N24RDYFnImFgOuItaNKZ4/IoT?node-id=34-327&t=YgI9L2gUc2z6Jy6q-1" target="_blank" rel="noreferrer" className="info-link">
                            figma.com/design/iot-web
                        </a>
                    </div>

                    <div className="info-item">
                        <div className="info-label">
                            <BsFileEarmarkText /> API DOC
                        </div>
                        <a href="https://documenter.getpostman.com/view/49368644/2sBXinG9yX" target="_blank" rel="noreferrer" className="info-link">
                            documenter.getpostman.com/view/iot-web
                        </a>
                    </div>

                    <div className="info-item">
                        <div className="info-label">
                            <BsFileEarmarkText /> Report
                        </div>
                        <a href="https://docs.google.com/document/d/1SnBSJGZRO3fsu7yMnkbz-bXphpF0God6zkD3n8OLW7U/edit?usp=sharing" target="_blank" rel="noreferrer" className="info-link">
                            docs.google.com/document/iot-web
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
