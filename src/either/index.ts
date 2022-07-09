class Success<S, F> {
  constructor(readonly data: S) {}

  isSuccess(): this is Success<S,F> {
    return true
  }
  
  isFailure(): this is Failure<S,F> {
    return false
  }
}

class Failure<S,F> {
  constructor(readonly data: F) {}
  
  isSuccess(): this is Success<S,F> {
    return false
  }
  
  isFailure(): this is Failure<S,F> {
    return true
  }
}

const success = <S, F>(data: S): Either<S, F> => {
  return new Success(data)
}

const failure = <S, F>(data: F): Either<S, F> => {
  return new Failure(data)
}

type Either<S, F> = Success<S, F> | Failure<S,F>