# © Copyright Charles Vanwynsberghe (2021)

# Pyworld3 is a computer program whose purpose is to run configurable
# simulations of the World3 model as described in the book "Dynamics
# of Growth in a Finite World".

# This software is governed by the CeCILL license under French law and
# abiding by the rules of distribution of free software. You can use,
# modify and/ or redistribute the software under the terms of the CeCILL
# license as circulated by CEA, CNRS and INRIA at the following URL
# "http://www.cecill.info".

# As a counterpart to the access to the source code and rights to copy,
# modify and redistribute granted by the license, users are provided only
# with a limited warranty and the software's author, the holder of the
# economic rights, and the successive licensors have only limited
# liability.

# In this respect, the user's attention is drawn to the risks associated
# with loading, using, modifying and/or developing or reproducing the
# software by the user in light of its specific status of free software,
# that may mean that it is complicated to manipulate, and that also
# therefore means that it is reserved for developers and experienced
# professionals having in-depth computer knowledge. Users are therefore
# encouraged to load and test the software's suitability as regards their
# requirements in conditions enabling the security of their systems and/or
# data to be ensured and, more generally, to use and operate it in the
# same conditions as regards security.

# The fact that you are presently reading this means that you have had
# knowledge of the CeCILL license and that you accept its terms.

from functools import wraps

from numpy import isnan

verbose_debug = False


def requires(outputs=None, inputs=None, check_at_init=True, check_after_init=True):
    """
    Decorator generator to reschedule all updates of current loop, if all
    required inputs of the current update are not known.

    """

    def requires_decorator(updater):

        if verbose_debug:
            print(
                f"""Define the update requirements...
                  - inputs:  {inputs}
                  - outputs: {outputs}
                  - check at init [k=0]:    {check_at_init}
                  - check after init [k>0]: {check_after_init}"""
            )
            print(
                "... and create a requires decorator for the update function",
                updater.__name__,
            )

        @wraps(updater)
        def requires_and_update(self, *args):
            k = args[0]
            go_grant = ((k == 0) and check_at_init) or ((k > 0) and check_after_init)
            if inputs is not None and go_grant:
                for input_ in inputs:
                    input_arr = getattr(self, input_.lower())
                    if isnan(input_arr[k]):
                        if self.verbose:
                            warn_msg = "Warning, {} unknown for current k={} -"
                            print(warn_msg.format(input_, k), updater.__name__)
                            print("Rescheduling current loop")
                        self.redo_loop = True

            return updater(self, *args)

        return requires_and_update

    return requires_decorator
