import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Building2, Settings, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

type Perfil = {
  id: string;
  nome: string;
};

interface EventoComRelacoes extends Evento {
  local: Local | null;
  responsavel_perfil: Perfil | null;
}

const Dashboard = ({ user, setActiveTab, setSelectedDate: setGlobalSelectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatsType, setSelectedStatsType] = useState('');
  const { toast } = useToast();

  // Query para estatísticas
  const { data: stats = { total: 0, pending: 0, active: 0 } } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: eventos, error } = await supabase
        .from('eventos')
        .select('status');
      if (error) throw error;
      const total = eventos?.length || 0;
      const pending = eventos?.filter(e => e.status === 'pending').length || 0;
      const active = eventos?.filter(e => e.status === 'approved').length || 0;
      return { total, pending, active };
    },
  });

  // Query para eventos com relações (usado em vários lugares)
  const { data: eventosComRelacoes = [] } = useQuery({
    queryKey: ['eventos-dashboard-relacoes'],
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
          locais!inner(id, nome, descricao)
        `)
        .order('data', { ascending: false });
      if (error) throw error;

      // Buscar perfis dos responsáveis
      const criadosPorIds = [...new Set(eventos.map(e => e.criado_por).filter(Boolean))];
      const { data: perfis } = await supabase
        .from('perfis')
        .select('id, nome')
        .in('id', criadosPorIds);
      const perfilMap = (perfis || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Perfil>);

      return eventos.map((evento: any): EventoComRelacoes => ({
        id: evento.id,
        titulo: evento.titulo,
        data: evento.data,
        descricao: evento.descricao,
        status: evento.status,
        local_id: evento.local_id,
        criado_por: evento.criado_por,
        local: evento.locais as Local | null,
        responsavel_perfil: evento.criado_por ? (perfilMap[evento.criado_por] || null) : null
      }));
    },
  });

  // Dados derivados
  const upcomingEvents = eventosComRelacoes
    .filter(e => new Date(e.data) >= new Date())
    .slice(0, 3);

  const recentReservations = eventosComRelacoes.slice(0, 3);

  const reservationsData = {
    total: eventosComRelacoes,
    pending: eventosComRelacoes.filter(e => e.status === 'pending'),
    active: eventosComRelacoes.filter(e => e.status === 'approved')
  };

  // Agrupar eventos por data para o calendário
  const eventosPorData = eventosComRelacoes.reduce((acc, evento) => {
    const dateKey = new Date(evento.data).toISOString().split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(evento);
    return acc;
  }, {} as Record<string, EventoComRelacoes[]>);

  // Função auxiliar para determinar o tipo de reservas de um dia
  const getReservationTypes = (day) => {
    const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayReservations = eventosPorData[dateKey] || [];
    const hasActive = dayReservations.some(res => res.status === 'approved');
    const hasPending = dayReservations.some(res => res.status === 'pending');
    return { hasActive, hasPending };
  };

  // Função para obter a classe CSS baseada no tipo de reservas
  const getCalendarDayClass = (day) => {
    const { hasActive, hasPending } = getReservationTypes(day);
    const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
    
    if (isToday) {
      return "bg-blue-600 text-white hover:bg-blue-700";
    }
    
    if (hasActive && hasPending) {
      return "bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium"; // Ambos: azul
    } else if (hasActive) {
      return "bg-green-100 text-green-800 hover:bg-green-200 font-medium"; // Apenas ativas: verde
    } else if (hasPending) {
      return "bg-orange-100 text-orange-800 hover:bg-orange-200 font-medium"; // Apenas pendentes: laranja
    }
    
    return "hover:bg-gray-100"; // Sem reservas
  };

  // Funções do calendário
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const hasReservations = (day) => {
    const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
    return eventosPorData[dateKey] && eventosPorData[dateKey].length > 0;
  };

  const handleDateClick = (day) => {
    const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayReservations = eventosPorData[dateKey] || [];
    setSelectedDate({
      day,
      reservations: dayReservations,
      dateKey,
      fullDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    });
    setShowReservationsModal(true);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleCreateReservation = () => {
    if (selectedDate && setGlobalSelectedDate) {
      // Passar a data selecionada para o componente pai
      setGlobalSelectedDate(selectedDate.fullDate);
    }
    setShowReservationsModal(false);
    // Redirecionar para a aba de nova reserva
    if (setActiveTab) {
      setActiveTab('new-reservation');
    }
  };

  // Função para renderizar o calendário
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Cabeçalho com os dias da semana
    const header = dayNames.map(day => (
      <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
        {day}
      </div>
    ));

    // Dias vazios no início do mês
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dayClass = getCalendarDayClass(day);
      
      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={cn(
            "p-2 text-center text-sm cursor-pointer rounded-lg transition-colors",
            dayClass
          )}
        >
          {day}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1">
          {header}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  // Função para abrir modal dos cards estatísticos
  const handleStatsCardClick = (type) => {
    setSelectedStatsType(type);
    setShowStatsModal(true);
  };

  // Função para aprovar/rejeitar reserva (placeholder)
  const handleApproveReservation = (reservationId: string) => {
    toast({ title: 'Aprovação não implementada', description: 'Use a aba Reservas para aprovar/rejeitar.' });
  };
  const handleRejectReservation = (reservationId: string) => {
    toast({ title: 'Rejeição não implementada', description: 'Use a aba Reservas para aprovar/rejeitar.' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Aprovado</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Pendente</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Rejeitado</span>;
      default:
        return null;
    }
  };

  const renderStatsModal = () => {
    let title = '';
    let data = [];

    switch (selectedStatsType) {
      case 'total':
        title = 'Total de Reservas';
        data = reservationsData.total;
        break;
      case 'pending':
        title = 'Aguardando Aprovação';
        data = reservationsData.pending;
        break;
      case 'active':
        title = 'Reservas Ativas';
        data = reservationsData.active;
        break;
      default:
        return null;
    }

    return (
      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Status</TableHead>
                  {selectedStatsType === 'pending' && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.titulo}</TableCell>
                    <TableCell>{item.local?.nome || 'Local não definido'}</TableCell>
                    <TableCell>{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    {selectedStatsType === 'pending' && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveReservation(item.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectReservation(item.id)}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all"
          onClick={() => handleStatsCardClick('total')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total de Reservas</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-all"
          onClick={() => handleStatsCardClick('pending')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Aguardando Aprovação</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 cursor-pointer hover:from-green-600 hover:to-green-700 transition-all"
          onClick={() => handleStatsCardClick('active')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Reservas Ativas</p>
                <p className="text-3xl font-bold">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário Mensal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Calendário de Reservas</span>
              </CardTitle>
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderCalendar()}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></div>
                <span>Reservas Ativas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded-full"></div>
                <span>Reservas Pendentes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full"></div>
                <span>Ativas e Pendentes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span>Hoje</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximos Eventos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Próximos Eventos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex flex-col p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{event.titulo}</p>
                      <p className="text-sm text-gray-600">{event.local?.nome || 'Local não definido'}</p>
                      <p className="text-sm text-gray-500">{new Date(event.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-blue-600 font-medium text-sm">
                      {new Date(event.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Reservas Recentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentReservations.map((reservation) => (
              <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{reservation.local?.nome || 'Local não definido'}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(reservation.data).toLocaleDateString('pt-BR')} às {new Date(reservation.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {reservation.status === 'approved' ? (
                    <span className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovado
                    </span>
                  ) : (
                    <span className="flex items-center text-orange-600 text-sm">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Pendente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Reservas do Dia */}
      <Dialog open={showReservationsModal} onOpenChange={setShowReservationsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate?.day}/{currentDate.getMonth() + 1}/{currentDate.getFullYear()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Botão para criar nova reserva */}
            <Button 
              onClick={handleCreateReservation}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Reserva para este dia</span>
            </Button>

            {/* Reservas existentes */}
            {selectedDate?.reservations && selectedDate.reservations.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Reservas existentes:</h4>
                  <div className="space-y-3">
                    {selectedDate.reservations.map((reservation) => (
                      <div key={reservation.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{reservation.titulo}</p>
                            <p className="text-sm text-gray-600">{reservation.local?.nome || 'Local não definido'}</p>
                            <p className="text-sm text-gray-500">Responsável: {reservation.responsavel_perfil?.nome || 'Não informado'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-blue-600">
                              {new Date(reservation.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              reservation.status === 'approved'
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            )}>
                              {reservation.status === 'approved' ? 'Aprovado' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedDate?.reservations && selectedDate.reservations.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p>Nenhuma reserva para este dia.</p>
                <p className="text-sm">Clique no botão acima para criar uma nova reserva.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Estatísticas */}
      {renderStatsModal()}
    </div>
  );
};

export default Dashboard;
