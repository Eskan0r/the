import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface BubbleCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export default function BubbleCard({ children, className = '', delay = 0 }: BubbleCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="bubble-warp">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves="3"
              seed="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <motion.div
        ref={ref}
        className={`bubble-card ${className}`}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{
          duration: 0.7,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(40px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 -1px 0 rgba(255, 255, 255, 0.2)',
          filter: 'url(#bubble-warp)',
          position: 'relative',
        }}
      >
        {children}
      </motion.div>
    </>
  )
}
