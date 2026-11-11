import { ArrowUpRight, Bug } from 'lucide-react';
import { useTranslation } from './i18n';
import './documentation.css';

export const documentationUrls = {
  readme: 'https://github.com/ArtifexEt/Hiciarz#readme',
  spotify: 'https://github.com/ArtifexEt/Hiciarz/blob/main/web/docs/spotify.md',
  playlists: 'https://github.com/ArtifexEt/Hiciarz/blob/main/web/docs/playlist-guide.md',
  configuration: 'https://github.com/ArtifexEt/Hiciarz/blob/main/web/docs/configuration.md',
} as const;

export const issueReportUrl = 'https://github.com/ArtifexEt/Hiciarz/issues/new';

export function ReportIssueLink() {
  const { t } = useTranslation();
  return (
    <a
      className="report-issue-link"
      href={issueReportUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Bug size={18} aria-hidden="true" />
      <span>{t('documentation.reportIssue')}</span>
      <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  );
}

export default function DocumentationLinks({ topic }: { topic?: 'spotify' }) {
  const { t } = useTranslation();
  if (topic === 'spotify')
    return (
      <a
        className="documentation-inline"
        href={documentationUrls.spotify}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('documentation.spotifyGuide')}
        <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    );

  return (
    <>
      <nav className="documentation-links" aria-label={t('documentation.title')}>
        <h3>{t('documentation.title')}</h3>
        <ul>
          {Object.entries(documentationUrls).map(([name, href]) => (
            <li key={name}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                <span>{t(`documentation.${name}`)}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <ReportIssueLink />
    </>
  );
}
