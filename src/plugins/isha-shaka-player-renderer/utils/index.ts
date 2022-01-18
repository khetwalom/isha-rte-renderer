// @ts-nocheck

export const lockToPortrait = () => {
  try {
    isMobile &&
      window.screen.orientation.lock('portrait').then(
        (success) => console.log(success),
        (failure) => console.log(failure)
      )
  } catch (error) {
    console.log('error in lockToPortrait-->', error)
  }
}

export const lockToLandscape = () => {
  try {
    isMobile &&
      window.screen.orientation.lock('landscape').then(
        (success) => console.log(success),
        (failure) => console.log(failure)
      )
  } catch (error) {
    console.log('error in lockToLandscape-->', error)
  }
}
