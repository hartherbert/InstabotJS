export interface IResult<T> {
  status: number;
  success: boolean;
  data?: T;
}
