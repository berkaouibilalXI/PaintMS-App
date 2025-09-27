import { useEffect, useState } from "react";
import invoiceService from "../services/invoiceService";
import clientService from "../services/clientService";
import productService from "../services/productService";
import InvoiceForm from "../components/InvoiceForm"; // Import your form
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/ui/stats-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, CheckCircle, Printer, Download, ArrowLeft } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChartNoAxesCombined } from "lucide-react";
import { PieChart, ResponsiveContainer, Pie, Cell } from "recharts";
import toast from "react-hot-toast";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inv, cli, prod] = await Promise.all([
        invoiceService.getInvoices(),
        clientService.getClients(),
        productService.getProducts(),
      ]);
      setInvoices(inv);
      setClients(cli);
      setProducts(prod);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erreur lors du chargement des données");
    }
  };

  // Checkbox selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedInvoices(invoices.map(inv => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (invoiceId, checked) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
  };

  // Print functionality
  const handlePrintSingle = async (invoiceId) => {
    setIsPrinting(true);
    try {
      const result = await invoiceService.printInvoice(invoiceId);
      if (result.success) {
        toast.success("Facture envoyée à l'imprimante");
      } else {
        toast.error("Erreur lors de l'impression: " + (result.error || "Erreur inconnue"));
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Erreur lors de l'impression");
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintMultiple = async () => {
    if (selectedInvoices.length === 0) {
      toast.error("Veuillez sélectionner au moins une facture à imprimer");
      return;
    }

    setIsPrinting(true);
    try {
      const result = await invoiceService.printMultipleInvoices(selectedInvoices);
      if (result.success) {
        toast.success(`${selectedInvoices.length} facture(s) envoyée(s) à l'imprimante`);
        setSelectedInvoices([]);
      } else {
        toast.error("Erreur lors de l'impression: " + (result.error || "Erreur inconnue"));
      }
    } catch (error) {
      console.error("Batch print error:", error);
      toast.error("Erreur lors de l'impression groupée");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportToPDF = async (invoiceIds) => {
    toast.info("Fonctionnalité d'export PDF à venir prochainement");
  };

  // Form handlers
  const handleFormSubmit = async (formData) => {
    try {
      if (editingInvoice) {
        await invoiceService.updateInvoice(editingInvoice.id, formData);
        toast.success("Facture modifiée avec succès");
      } else {
        await invoiceService.createInvoice(formData);
        toast.success("Facture créée avec succès");
      }

      setShowForm(false);
      setEditingInvoice(null);
      loadData();
    } catch (error) {
      console.error("Error submitting invoice:", error);
      toast.error("Erreur lors de l'enregistrement de la facture");
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingInvoice(null);
  };

  const handleNewInvoice = () => {
    setEditingInvoice(null);
    setShowForm(true);
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await invoiceService.deleteInvoice(id);
      toast.success("Facture supprimée avec succès");
      loadData();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const markAsPaid = async (id) => {
    try {
      await invoiceService.markAsPaid(id);
      toast.success("Facture marquée comme payée");
      loadData();
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const markAsUnpaid = async (id) => {
    try {
      await invoiceService.markAsUnpaid(id);
      toast.success("Facture marquée comme non payée");
      loadData();
    } catch (error) {
      console.error("Error marking as unpaid:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const paidTotal = invoices.filter((i)=>i.paid).reduce((s, i)=> s + (i.total || 0), 0);
  const unpaidTotal = invoices.filter((i)=>!i.paid).reduce((s, i)=> s + (i.total || 0), 0);

  // Show form view
  if (showForm) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={handleFormCancel}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Button>
          <h1 className="text-2xl font-bold">
            {editingInvoice ? "Modifier la facture" : "Nouvelle facture"}
          </h1>
        </div>
        
        <InvoiceForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          clients={clients}
          products={products}
          editingInvoice={editingInvoice}
        />
      </div>
    );
  }

  // Show main list view
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bons / Factures</h1>
        <div className="flex gap-2">
          {selectedInvoices.length > 0 && (
            <div className="flex gap-2">
              <Button 
                onClick={handlePrintMultiple}
                variant="outline"
                disabled={isPrinting}
                className="bg-blue-50 hover:bg-blue-100 border-blue-200"
              >
                <Printer className="w-4 h-4 mr-2" />
                {isPrinting ? "Impression..." : `Imprimer (${selectedInvoices.length})`}
              </Button>
              <Button 
                onClick={() => handleExportToPDF(selectedInvoices)}
                variant="outline"
                className="bg-green-50 hover:bg-green-100 border-green-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter PDF ({selectedInvoices.length})
              </Button>
            </div>
          )}
          <Button onClick={handleNewInvoice}>
            <Plus className="w-4 h-4 mr-2" /> Nouveau Bon
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Sélectionner tout"
                />
              </TableHead>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total (DZD)</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Aucune facture trouvée
                </TableCell>
              </TableRow>
            ) : (
              <>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInvoices.includes(inv.id)}
                        onCheckedChange={(checked) => handleSelectInvoice(inv.id, checked)}
                        aria-label={`Sélectionner facture ${inv.invoiceNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {inv.client?.name || "Client inconnu"}
                    </TableCell>
                    <TableCell>
                      {new Date(inv.date).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>{inv.total?.toFixed(2)} DZD</TableCell>
                    <TableCell>
                      <Badge variant={inv.paid ? "default" : "secondary"}>
                        {inv.paid ? "Payé" : "Non payé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isPrinting}
                                onClick={() => handlePrintSingle(inv.id)}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Imprimer</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  inv.paid
                                    ? markAsUnpaid(inv.id)
                                    : markAsPaid(inv.id)
                                }
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {inv.paid
                                ? "Marquer comme non payé"
                                : "Marquer comme payé"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(inv)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Modifier</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Confirmer la suppression
                                    </AlertDialogTitle>
                                    <div className="text-sm text-muted-foreground">
                                      Êtes-vous sûr de vouloir supprimer cette
                                      facture ? Cette action ne peut pas être
                                      annulée.
                                    </div>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(inv.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TooltipTrigger>
                            <TooltipContent>Supprimer</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell></TableCell>
                  <TableCell colSpan={3} className="font-bold text-right">
                    Sous-total :
                  </TableCell>
                  <TableCell className="font-bold">
                    {invoices
                      .reduce((sum, i) => sum + (i.total || 0), 0)
                      .toFixed(2)}{" "}
                    DZD
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Separator className="mt-8 dark:bg-gray-300" />

      <div>
        <StatCard
          title="Total des Factures"
          value={`${invoices
            .reduce((sum, i) => sum + (i.total || 0), 0)
            .toFixed(2)} DZD`}
          icon={<ChartNoAxesCombined className="h-6 w-6 text-primary" />}
        />
        <div className="w-full h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={[{name: "Payé", value: paidTotal}, {name: "Non payé", value: unpaidTotal}]}
                innerRadius={40}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey={"value"}
                label
                >
                <Cell fill="green" />
                <Cell fill="red" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}