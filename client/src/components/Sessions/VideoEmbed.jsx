import { ExternalLink } from 'lucide-react';

function getEmbedUrl(url) {
  if (!url) return null;

  // YouTube
  let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  if (match) return { type: 'iframe', src: `https://www.youtube.com/embed/${match[1]}` };

  // Loom
  match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (match) return { type: 'iframe', src: `https://www.loom.com/embed/${match[1]}` };

  // Vimeo
  match = url.match(/vimeo\.com\/(\d+)/);
  if (match) return { type: 'iframe', src: `https://player.vimeo.com/video/${match[1]}` };

  // Google Drive
  match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (match) return { type: 'iframe', src: `https://drive.google.com/file/d/${match[1]}/preview` };

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
        className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
      >
        <ExternalLink size={16} />
        Open recording
      </a>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={embed.src}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
