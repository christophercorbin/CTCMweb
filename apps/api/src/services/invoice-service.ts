import { InvoiceRepository, InvoiceFilters } from '../repositories/invoice-repository';
import type { Invoice, CreateInvoiceInput, UpdateInvoiceInput, UserContext } from '@ctcm/types';

export class InvoiceService {
  private repository: InvoiceRepository;

  constructor() {
    this.repository = new InvoiceRepository();
  }

  /**
   * Gets all invoices with tenant isolation and optional filters
   * Admin users see all invoices, customer users see only their own
   */
  async getAllInvoices(userContext: UserContext, filters?: InvoiceFilters): Promise<Invoice[]> {
    return this.repository.findAll(userContext, filters);
  }

  /**
   * Gets an invoice by ID with tenant isolation
   */
  async getInvoiceById(id: string, userContext: UserContext): Promise<Invoice> {
    const invoice = await this.repository.findById(id, userContext);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  }

  /**
   * Gets an invoice by invoice number with tenant isolation
   */
  async getInvoiceByNumber(invoiceNumber: string, userContext: UserContext): Promise<Invoice> {
    const invoice = await this.repository.findByInvoiceNumber(invoiceNumber, userContext);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  }

  /**
   * Creates a new invoice with validation
   */
  async createInvoice(
    input: CreateInvoiceInput,
    userContext: UserContext
  ): Promise<Invoice> {
    // Only admins can create invoices
    if (userContext.role !== 'admin') {
      throw new Error('Only administrators can create invoices');
    }

    // Validate required fields
    if (!input.customerId || input.customerId.trim().length === 0) {
      throw new Error('Customer ID is required');
    }

    if (!input.invoiceNumber || input.invoiceNumber.trim().length === 0) {
      throw new Error('Invoice number is required');
    }

    if (input.subtotal === undefined || input.subtotal < 0) {
      throw new Error('Subtotal must be a non-negative number');
    }

    if (input.total === undefined || input.total < 0) {
      throw new Error('Total must be a non-negative number');
    }

    if (!input.issueDate) {
      throw new Error('Issue date is required');
    }

    if (!input.dueDate) {
      throw new Error('Due date is required');
    }

    // Validate that due date is after issue date
    const issueDate = new Date(input.issueDate);
    const dueDate = new Date(input.dueDate);
    
    if (dueDate < issueDate) {
      throw new Error('Due date must be on or after issue date');
    }

    // Check invoice number uniqueness
    const invoiceNumberExists = await this.repository.invoiceNumberExists(input.invoiceNumber);
    if (invoiceNumberExists) {
      throw new Error('Invoice number is already in use');
    }

    // Calculate tax if not provided (default to 0)
    const tax = input.tax !== undefined ? input.tax : 0;

    // Validate that total = subtotal + tax
    const expectedTotal = input.subtotal + tax;
    if (Math.abs(input.total - expectedTotal) > 0.01) {
      throw new Error('Total must equal subtotal plus tax');
    }

    return this.repository.create(input, userContext);
  }

  /**
   * Updates an invoice with validation and tenant isolation
   */
  async updateInvoice(
    id: string,
    input: UpdateInvoiceInput,
    userContext: UserContext
  ): Promise<Invoice> {
    // Verify invoice exists and user has access
    const existingInvoice = await this.getInvoiceById(id, userContext);

    // Only admins can update invoices
    if (userContext.role !== 'admin') {
      throw new Error('Only administrators can update invoices');
    }

    // Validate amounts if provided
    if (input.subtotal !== undefined && input.subtotal < 0) {
      throw new Error('Subtotal must be a non-negative number');
    }

    if (input.tax !== undefined && input.tax < 0) {
      throw new Error('Tax must be a non-negative number');
    }

    if (input.total !== undefined && input.total < 0) {
      throw new Error('Total must be a non-negative number');
    }

    // Validate dates if provided
    if (input.issueDate && input.dueDate) {
      const issueDate = new Date(input.issueDate);
      const dueDate = new Date(input.dueDate);
      
      if (dueDate < issueDate) {
        throw new Error('Due date must be on or after issue date');
      }
    } else if (input.issueDate && existingInvoice.dueDate) {
      const issueDate = new Date(input.issueDate);
      const dueDate = new Date(existingInvoice.dueDate);
      
      if (dueDate < issueDate) {
        throw new Error('Due date must be on or after issue date');
      }
    } else if (input.dueDate && existingInvoice.issueDate) {
      const issueDate = new Date(existingInvoice.issueDate);
      const dueDate = new Date(input.dueDate);
      
      if (dueDate < issueDate) {
        throw new Error('Due date must be on or after issue date');
      }
    }

    // Validate total = subtotal + tax if any of these are being updated
    if (input.subtotal !== undefined || input.tax !== undefined || input.total !== undefined) {
      const subtotal = input.subtotal !== undefined ? input.subtotal : existingInvoice.subtotal;
      const tax = input.tax !== undefined ? input.tax : existingInvoice.tax;
      const total = input.total !== undefined ? input.total : existingInvoice.total;

      const expectedTotal = subtotal + tax;
      if (Math.abs(total - expectedTotal) > 0.01) {
        throw new Error('Total must equal subtotal plus tax');
      }
    }

    // If status is being set to 'paid', set paid_date to today if not provided
    if (input.status === 'paid' && !input.paidDate && !existingInvoice.paidDate) {
      input.paidDate = new Date();
    }

    const updated = await this.repository.updateInvoice(id, input, userContext);
    
    if (!updated) {
      throw new Error('Failed to update invoice');
    }

    return updated;
  }
}
