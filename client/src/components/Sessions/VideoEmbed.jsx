import { ExternalLink } from 'lucide-react';

function getEmbedUrl(url) {
  if (!url) return null;

  let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  if (match) return { type: 'iframe', src: `https://www.youtube.com/embed/${match[1]}` };

  match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (match) return { type: 'iframe', src: `https://www.loom.com/embed/${match[1]}` };

  match = url.match(/vimeo\.com\/(\d+)/);
  if (match) return { type: 'iframe', src: `https://player.vimeo.com/video/${match[1]}` };

  match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (match) return { type: 'iframe', src: `https://drive.google.com/file/d/${match[1]}/preview` };

  // Fathom: fathom.video/share/XYZ or app.fathom.video/share/XYZ
  match = url.match(/fathom\.video\/share\/([a-zA-Z0-9_-]+)/);
  if (match) return { type: 'iframe', src: `https://fathom.video/share/${match[1]}/embed` };

  return { type: 'link', src: url };
}

export default function VideoEmbed({ url }) {
  const embed = getEmbedUrl(url);
  if (!embed) return null;

  if (embed.type === 'link') {
    return (
      <a
        href={embed.src}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-[11px] font-bold uppercase transition-colors"
        style={{ color: '#E8792F', letterSpacing: '0.04em' }}
      >
        <ExternalLink size={14} />
        Open recording
      </a>
    );
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <iframe
        src={embed.src}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
