"use server";
import { redirect } from "next/navigation";
import { Xendit } from "xendit-node";
import { CreateInvoiceRequest, Invoice } from "xendit-node/invoice/models";
import { handleError } from "../utils";
import { connectToDatabase } from "../database/mongoose";
import Transaction from "../database/models/transaction.model";
import { updateCredits } from "./user.actions";

export async function checkoutCredits(transaction: CheckoutTransactionParams) {
  const xnd = new Xendit({
    secretKey: process.env.XENDIT_SECRET_KEY!,
  });

  const amount = Number(transaction.amount) * 1000; // Konversi ke sen

  // Buat data invoice
  const data: CreateInvoiceRequest & { metadata?: any } = {
    externalId: transaction.buyerId,
    amount: amount,
    description: transaction.plan,
    currency: "IDR",
    items: [
      {
        name: transaction.plan,
        quantity: 1,
        price: amount
      },
    ],
    metadata: {
      plan: transaction.plan,
      credits: transaction.credits,
      buyerId: transaction.buyerId
    },
    successRedirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`,
    failureRedirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
  };

  // Buat invoice melalui API Xendit
  const response: Invoice = await xnd.Invoice.createInvoice({
    data,
  });

  redirect(response.invoiceUrl);
}

export async function createTransaction(transaction: CreateTransactionParams) {
  try {
    await connectToDatabase()

    const newTransaction = await Transaction.create({
      ...transaction, buyer: transaction.buyerId
    })

    await updateCredits(transaction.buyerId, transaction.credits)

    return JSON.parse(JSON.stringify(newTransaction));
  } catch (error) {
    handleError(error)
  }
}