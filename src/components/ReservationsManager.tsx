
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Filter, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Evento = {
  id: string;
  titulo: string;
  data: string;
  descricao: string | null;
  status: string;
  local_id: string | null;
  criado_por: string | null;
};

type Local = {
  id: string;
  nome: string;
  descricao: string | null;
};

type Equipamento = {
  id: string;
  nome: string;
};

type Perfil = {
  id: string;
  nome: string;
};

interface EventoComRelacoes extends Evento {
  local: Local | null;
  equipamentos: Equipamento[];
  responsavel_perfil: Perfil | null;
}

const ReservationsManager = ({ user }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['eventos-com-relacoes'],
    queryFn: async (): Promise<EventoComRelacoes[]> => {
      const { data: eventos, error } = await supabase
        .from('eventos')
        .select(`
          id,
          titulo,
          data,
          descricao,
          status,
          local_id,
          criado_por,
          locais!inner(id, nome, descricao),
          eventos_equipamentos!inner(equipamento_id, equipamentos!inner(id, nome))
        `)
        .order('data', { ascending: false });

      if (error) throw error;

      // Buscar perfis dos responsáveis (criado_por)
      const criadosPorIds = [...new Set(eventos.map(e => e.criado_por).filter(Boolean))];
      const { data: perfis } = await supabase
        .from('perfis')
        .select('id, nome')
        .in('id', criadosPorIds);

      const perfilMap = (perfis || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, Perfil>);

      return eventos.map((evento: any): EventoComRelacoes => {
        const equipamentos = (evento.eventos_equipamentos || [])
          .map((ee: any) => ee.equipamentos)
          .filter(Boolean);
        return {
          id: evento.id,
          titulo: evento.titulo,
          data: evento.data,
          descricao: evento.descricao,
          status: evento.status,
          local_id: evento.local_id,
          criado_por: evento.criado_por,
          local: evento.locais as Local | null,
          equipamentos,
          responsavel_perfil: evento.criado_por ? (perfilMap[evento.criado_por] || null) : null
        };
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('eventos')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-com-relacoes'] });
      toast({ title: 'Status atualizado com sucesso' });
    },
    onError: (err) => {
      toast({ title: 'Erro ao atualizar status', description: err.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status) => {
    const variants = {
      approved: { variant: 'default', className: 'bg-green-500 hover:bg-green-600', text: 'Aprovado' },
      pending: { variant: 'secondary', className: 'bg-orange-500 hover:bg-orange-600 text-white', text: 'Pendente' },
      rejected: { variant: 'destructive', text: 'Rejeitado' }
    };
    
    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  const filteredReservations = eventos.filter(reservation => {
    const matchesFilter = filter === 'all' || reservation.status === filter;
    const matchesSearch =
      (reservation.local?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.responsavel_perfil?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.titulo || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDateTime = (data: string) => {
    const d = new Date(data);
    const date = d.toLocaleDateString('pt-BR');
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por local ou responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as reservas</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Reservas */}
      <div className="grid gap-4">
        {filteredReservations.map((reservation) => (
          <Card key={reservation.id} className="hover:shadow-md transition-shadow">
            <CardContent>
              <div className="flex items-start justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{reservation.local?.nome || 'Local não definido'}</h3>
                    <p className="text-gray-600 flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDateTime(reservation.data).date} às {formatDateTime(reservation.data).time}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Responsável</p>
                    <p className="font-medium">{reservation.responsavel_perfil?.nome || 'Não informado'}</p>
                    <p className="text-sm text-gray-600 mt-1">Criado por: {reservation.responsavel_perfil?.nome || 'Sistema'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Equipamentos</p>
                    <p className="text-sm">
                      {reservation.equipamentos.length > 0
                        ? reservation.equipamentos.map(eq => eq.nome).join(', ')
                        : 'Nenhum equipamento'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {getStatusBadge(reservation.status)}
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Detalhes da Reserva</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium">Local</h4>
                          <p className="text-gray-600">{reservation.local?.nome || 'Local não definido'}</p>
                        </div>
                        <div>
                          <h4 className="font-medium">Data e Horário</h4>
                          <p className="text-gray-600">
                            {formatDateTime(reservation.data).date} às {formatDateTime(reservation.data).time}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">Responsável</h4>
                          <p className="text-gray-600">{reservation.responsavel_perfil?.nome || 'Não informado'}</p>
                        </div>
                        <div>
                          <h4 className="font-medium">Equipamentos</h4>
                          <p className="text-gray-600">
                            {reservation.equipamentos.length > 0
                              ? reservation.equipamentos.map(eq => eq.nome).join(', ')
                              : 'Nenhum equipamento'
                            }
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">Status</h4>
                          {getStatusBadge(reservation.status)}
                        </div>
                        {reservation.descricao && (
                          <div>
                            <h4 className="font-medium">Descrição</h4>
                            <p className="text-gray-600">{reservation.descricao}</p>
                          </div>
                        )}
                      </div>
                      
                      {user?.user_metadata?.role === 'admin_equipamento' || user?.user_metadata?.role === 'super_admin' ? (
                        <div className="flex space-x-2 mt-6">
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({ id: reservation.id, status: 'approved' })}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({ id: reservation.id, status: 'rejected' })}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Rejeitar
                          </Button>
                        </div>
                      ) : null}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReservations.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma reserva encontrada</h3>
            <p className="text-gray-600">Tente ajustar os filtros ou criar uma nova reserva.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReservationsManager;
