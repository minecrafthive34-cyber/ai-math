import React, { useState, useCallback } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { SolveInput, SolutionResponse } from '../types';
import LinkIcon from './icons/LinkIcon';
import DownloadIcon from './icons/DownloadIcon';
import LoadingSpinner from './icons/LoadingSpinner';
import TwitterIcon from './icons/TwitterIcon';
import FacebookIcon from './icons/FacebookIcon';
import LinkedInIcon from './icons/LinkedInIcon';

declare global {
    interface Window {
        html2canvas: any;
    }
}

interface ShareMenuProps {
    problem: SolveInput | null;
    solution: SolutionResponse;
    solutionElement: HTMLElement | null;
    onClose: () => void;
}

const ShareMenu: React.FC<ShareMenuProps> = ({ problem, solution, solutionElement, onClose }) => {
    const { t, language } = useLanguage();
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const generateShareUrl = useCallback(() => {
        if (typeof problem !== 'string') {
            return null;
        }
        const dataToShare = {
            problem,
            solution,
            language,
        };
        try {
            const jsonString = JSON.stringify(dataToShare);
            const base64String = btoa(unescape(encodeURIComponent(jsonString)));
            const urlSafeBase64 = encodeURIComponent(base64String);
            return `${window.location.origin}${window.location.pathname}#data=${urlSafeBase64}`;
        } catch (error) {
            console.error('Failed to create share link:', error);
            alert('Could not create share link.');
            return null;
        }
    }, [problem, solution, language]);

    const handleCopyLink = () => {
        const shareUrl = generateShareUrl();
        if (!shareUrl) {
            alert(t('shareLinkDisabledTooltip'));
            return;
        }
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopyStatus('copied');
            setTimeout(() => {
                setCopyStatus('idle');
                onClose();
            }, 2000);
        });
    };

    const handleDownloadImage = async () => {
        if (!solutionElement || !window.html2canvas) {
            alert('Could not generate image. The required library is missing.');
            return;
        }
        setIsGeneratingImage(true);
        try {
            const canvas = await window.html2canvas(solutionElement, {
                backgroundColor: '#1f2937', // bg-gray-800
                scale: 2, // Higher resolution
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${solution.title.replace(/ /g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error generating image:', error);
            alert('An error occurred while generating the image.');
        } finally {
            setIsGeneratingImage(false);
            onClose();
        }
    };

    const handleSocialShare = (platform: 'twitter' | 'facebook' | 'linkedin') => {
        const url = generateShareUrl();
        if (!url) {
            alert(t('shareLinkDisabledTooltip'));
            return;
        }

        const text = `Check out this math problem solution: ${solution.title}`;
        let shareUrl = '';

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
                break;
        }
        
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        onClose();
    };

    const isLinkSharingDisabled = typeof problem !== 'string';

    return (
        <div className="absolute top-full mt-2 end-0 w-56 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-20" role="menu" aria-orientation="vertical" aria-labelledby="share-button">
            <div className="py-1">
                <button
                    onClick={handleCopyLink}
                    disabled={isLinkSharingDisabled}
                    title={isLinkSharingDisabled ? t('shareLinkDisabledTooltip') : t('copyLink')}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <LinkIcon className="w-5 h-5 me-3" />
                    <span>{copyStatus === 'copied' ? t('linkCopied') : t('copyLink')}</span>
                </button>
                <button
                    onClick={handleDownloadImage}
                    disabled={isGeneratingImage}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 disabled:opacity-50"
                >
                    {isGeneratingImage ? (
                        <LoadingSpinner className="w-5 h-5 me-3" />
                    ) : (
                        <DownloadIcon className="w-5 h-5 me-3" />
                    )}
                    <span>{isGeneratingImage ? t('generatingImage') : t('downloadImage')}</span>
                </button>
            </div>
            <div className="border-t border-gray-600 my-1"></div>
            <div className="px-4 pt-2 pb-1 text-xs text-gray-400 text-start">{t('shareVia')}</div>
            <div className="flex justify-around items-center px-2 py-2">
                <button onClick={() => handleSocialShare('twitter')} title={t('shareOnTwitter')} disabled={isLinkSharingDisabled} className="p-2 text-gray-300 hover:text-white disabled:text-gray-500 disabled:cursor-not-allowed rounded-full hover:bg-gray-600 transition-colors">
                    <TwitterIcon className="w-5 h-5" />
                </button>
                 <button onClick={() => handleSocialShare('facebook')} title={t('shareOnFacebook')} disabled={isLinkSharingDisabled} className="p-2 text-gray-300 hover:text-white disabled:text-gray-500 disabled:cursor-not-allowed rounded-full hover:bg-gray-600 transition-colors">
                    <FacebookIcon className="w-5 h-5" />
                </button>
                 <button onClick={() => handleSocialShare('linkedin')} title={t('shareOnLinkedIn')} disabled={isLinkSharingDisabled} className="p-2 text-gray-300 hover:text-white disabled:text-gray-500 disabled:cursor-not-allowed rounded-full hover:bg-gray-600 transition-colors">
                    <LinkedInIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default ShareMenu;