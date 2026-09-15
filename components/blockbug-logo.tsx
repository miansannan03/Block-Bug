interface BlockBugLogoProps {
  appName?: string
  className?: string
}

export function BlockBugLogo({ appName = 'BlockBug', className = '' }: BlockBugLogoProps) {
  const imageClassName = `w-auto object-contain ${className}`

  return (
    <>
      <img
        src="/assets/blockbug-logo.png"
        alt={`${appName} logo`}
        width="1671"
        height="428"
        className={`dark:hidden ${imageClassName}`}
      />
      <img
        src="/assets/blockbug-logo-dark.png"
        alt={`${appName} logo`}
        width="1671"
        height="428"
        className={`hidden dark:block ${imageClassName}`}
      />
    </>
  )
}
