import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/dashboard/productos',
        destination: '/dashboard/inventario',
        permanent: true,
      },
      {
        source: '/dashboard/clientes',
        destination: '/dashboard/pedidos',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;