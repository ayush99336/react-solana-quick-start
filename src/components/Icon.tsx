import * as React from 'react'

export const Icon = ({ name, className = '' }: { name: string; className?: string }) => {
    const common = (svg: React.ReactNode) => (
        <span className={"inline-flex items-center " + className} aria-hidden>
            {svg}
        </span>
    )

    switch (name) {
        case 'home':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3 9.75L12 3l9 6.75V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.75z" />
                </svg>
            )
        case 'search':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
            )
        case 'wallet':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M2 7a2 2 0 012-2h14a2 2 0 012 2v2h-2a2 2 0 000 4h2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" />
                </svg>
            )
        case 'refresh':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
                </svg>
            )
        case 'copy':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M16 1H4a1 1 0 00-1 1v12h2V3h10V1zM20 5H8a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1zm-1 14H9V7h10v12z" />
                </svg>
            )
        case 'check':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M20.285 6.708l-11.39 11.39-5.293-5.293 1.414-1.414 3.879 3.88 9.976-9.976z" />
                </svg>
            )
        case 'error':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M11 7h2v6h-2V7zm0 8h2v2h-2v-2z" />
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
            )
        case 'qr':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zM15 3h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zM9 9h6v6H9V9zM21 15h-2v2h2v-2z" />
                </svg>
            )
        case 'user':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z" />
                </svg>
            )
        case 'settings':
            return common(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9.4 3a7.9 7.9 0 01-.1 1l2 1.6-2 3.4-2.4-1a8.6 8.6 0 01-1.2.7l-.4 2.6H9.3l-.4-2.6a8.6 8.6 0 01-1.2-.7L5.3 18 3.3 14.6l2-1.6a7.9 7.9 0 010-2l-2-1.6L5.3 6l2.4 1a8.6 8.6 0 011.2-.7L9.3 4h5.4l.4 2.6c.4.2.8.4 1.2.7l2.4-1 2 3.4-2 1.6z" />
                </svg>
            )
        default:
            return null
    }
}

export default Icon
