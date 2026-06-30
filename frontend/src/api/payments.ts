import client from './client';

export interface CreatePaymentResponse {
  orderCode: number;
  checkoutUrl: string;
  amount: number;
  durationMonths: number;
}

export interface TransactionStatusResponse {
  orderCode: number;
  status: string; // PENDING, PAID, CANCELLED
  amount: number;
  durationMonths: number;
  updatedAt: string;
}

export async function createPaymentLink(durationMonths: number): Promise<CreatePaymentResponse> {
  const { data } = await client.post<CreatePaymentResponse>('/payments/create-link', {
    durationMonths,
  });
  return data;
}

export async function getTransactionStatus(orderCode: number): Promise<TransactionStatusResponse> {
  const { data } = await client.get<TransactionStatusResponse>(`/payments/status/${orderCode}`);
  return data;
}
